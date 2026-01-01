// Authentication Module for iCTrL Extension
// Uses Chrome Identity API for Google Sign-In

class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.listeners = [];
    }

    // Add auth state change listener
    onAuthStateChanged(callback) {
        this.listeners.push(callback);
        // Immediately call with current state
        callback(this.user);
    }

    // Notify all listeners of auth state change
    notifyListeners() {
        this.listeners.forEach(cb => cb(this.user));
    }

    // Initialize auth state from storage
    async init() {
        try {
            const result = await chrome.storage.local.get(['authUser', 'authToken']);
            if (result.authUser && result.authToken) {
                this.user = result.authUser;
                this.token = result.authToken;

                // Validate token is still valid
                const isValid = await this.validateToken();
                if (!isValid) {
                    await this.signOut();
                }
            }
            this.notifyListeners();
        } catch (error) {
            console.error('[Auth] Init error:', error);
        }
    }

    // Validate token with Google
    async validateToken() {
        if (!this.token) return false;

        try {
            const response = await fetch(
                `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.token}`
            );
            return response.ok;
        } catch {
            return false;
        }
    }

    // Sign in with Google using Chrome Identity API
    async signIn() {
        try {
            // Get OAuth token from Chrome
            const token = await new Promise((resolve, reject) => {
                chrome.identity.getAuthToken({ interactive: true }, (token) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(token);
                    }
                });
            });

            if (!token) {
                throw new Error('Failed to get auth token');
            }

            this.token = token;

            // Get user info from Google
            const userInfo = await this.fetchUserInfo(token);

            this.user = {
                uid: userInfo.id,
                email: userInfo.email,
                displayName: userInfo.name,
                photoURL: userInfo.picture
            };

            // Save to storage
            await chrome.storage.local.set({
                authUser: this.user,
                authToken: this.token
            });

            // Create/update user document in Firestore
            await this.createUserDocument();

            this.notifyListeners();
            console.log('[Auth] Signed in:', this.user.email);

            return this.user;
        } catch (error) {
            console.error('[Auth] Sign in error:', error);
            throw error;
        }
    }

    // Fetch user info from Google
    async fetchUserInfo(token) {
        const response = await fetch(
            'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        return response.json();
    }

    // Create user document in Firestore
    async createUserDocument() {
        if (!this.user || !this.token) return;

        const userDocPath = `${FIRESTORE_BASE_URL}/users/${this.user.uid}`;

        try {
            // Check if user exists
            const checkResponse = await fetch(userDocPath, {
                headers: { Authorization: `Bearer ${this.token}` }
            });

            if (checkResponse.status === 404) {
                // Create new user document
                await fetch(userDocPath, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: {
                            email: { stringValue: this.user.email },
                            displayName: { stringValue: this.user.displayName || '' },
                            photoURL: { stringValue: this.user.photoURL || '' },
                            createdAt: { timestampValue: new Date().toISOString() },
                            lastLogin: { timestampValue: new Date().toISOString() }
                        }
                    })
                });
                console.log('[Auth] Created user document');
            } else {
                // Update last login
                await fetch(`${userDocPath}?updateMask.fieldPaths=lastLogin`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: {
                            lastLogin: { timestampValue: new Date().toISOString() }
                        }
                    })
                });
            }
        } catch (error) {
            console.error('[Auth] Error creating user document:', error);
        }
    }

    // Sign out
    async signOut() {
        try {
            // Revoke token with Chrome
            if (this.token) {
                await new Promise((resolve) => {
                    chrome.identity.removeCachedAuthToken({ token: this.token }, resolve);
                });
            }

            this.user = null;
            this.token = null;

            // Clear from storage
            await chrome.storage.local.remove(['authUser', 'authToken']);

            this.notifyListeners();
            console.log('[Auth] Signed out');
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
        }
    }

    // Get current user
    getCurrentUser() {
        return this.user;
    }

    // Get current token
    getToken() {
        return this.token;
    }

    // Check if signed in
    isSignedIn() {
        return this.user !== null && this.token !== null;
    }
}

// Create global instance
const authManager = new AuthManager();

// Initialize on load
if (typeof window !== 'undefined') {
    window.authManager = authManager;
}
