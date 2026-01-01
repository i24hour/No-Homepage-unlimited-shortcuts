// Authentication Module for iCTrL Extension
// Uses Chrome Identity API for Google Sign-In + Firebase Auth for ID token

class AuthManager {
    constructor() {
        this.user = null;
        this.googleToken = null;  // Google OAuth access token
        this.firebaseToken = null; // Firebase ID token for Firestore
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
            const result = await chrome.storage.local.get(['authUser', 'googleToken', 'firebaseToken']);
            if (result.authUser && result.firebaseToken) {
                this.user = result.authUser;
                this.googleToken = result.googleToken;
                this.firebaseToken = result.firebaseToken;

                // Validate Firebase token is still valid
                const isValid = await this.validateFirebaseToken();
                if (!isValid) {
                    // Try to refresh with Google token
                    if (this.googleToken) {
                        try {
                            await this.exchangeForFirebaseToken(this.googleToken);
                        } catch {
                            await this.signOut();
                        }
                    } else {
                        await this.signOut();
                    }
                }
            }
            this.notifyListeners();
        } catch (error) {
            console.error('[Auth] Init error:', error);
        }
    }

    // Validate Firebase token
    async validateFirebaseToken() {
        if (!this.firebaseToken) return false;

        try {
            // Try a simple Firestore read to validate token
            const testUrl = `${FIRESTORE_BASE_URL}/users/test?key=${FIREBASE_CONFIG.apiKey}`;
            const response = await fetch(testUrl, {
                headers: { 'Authorization': `Bearer ${this.firebaseToken}` }
            });
            // 404 is fine (doc doesn't exist), 401/403 means token expired
            return response.status !== 401 && response.status !== 403;
        } catch {
            return false;
        }
    }

    // Sign in with Google using Chrome Identity API
    async signIn() {
        try {
            console.log('[Auth] Starting sign in...');

            // Step 1: Get OAuth token from Chrome
            const googleToken = await new Promise((resolve, reject) => {
                chrome.identity.getAuthToken({ interactive: true }, (token) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(token);
                    }
                });
            });

            if (!googleToken) {
                throw new Error('Failed to get Google auth token');
            }

            console.log('[Auth] Got Google token');
            this.googleToken = googleToken;

            // Step 2: Exchange Google token for Firebase ID token
            await this.exchangeForFirebaseToken(googleToken);

            // Step 3: Get user info from Google
            const userInfo = await this.fetchUserInfo(googleToken);

            this.user = {
                uid: userInfo.id,
                email: userInfo.email,
                displayName: userInfo.name,
                photoURL: userInfo.picture
            };

            // Save to storage
            await chrome.storage.local.set({
                authUser: this.user,
                googleToken: this.googleToken,
                firebaseToken: this.firebaseToken
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

    // Exchange Google OAuth token for Firebase ID token
    async exchangeForFirebaseToken(googleToken) {
        console.log('[Auth] Exchanging for Firebase token...');

        // Use Firebase Auth REST API - signInWithIdp
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_CONFIG.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postBody: `access_token=${googleToken}&providerId=google.com`,
                requestUri: 'https://localhost',
                returnSecureToken: true,
                returnIdpCredential: true
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Auth] Firebase token exchange failed:', error);
            throw new Error('Failed to get Firebase token');
        }

        const data = await response.json();
        this.firebaseToken = data.idToken;

        // Update user UID to use Firebase UID (more reliable)
        if (data.localId) {
            if (this.user) {
                this.user.uid = data.localId;
            }
        }

        console.log('[Auth] Got Firebase token');
        return this.firebaseToken;
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

    // Create user document in Firestore (using Firebase token)
    async createUserDocument() {
        if (!this.user || !this.firebaseToken) return;

        const userDocPath = `${FIRESTORE_BASE_URL}/users/${this.user.uid}`;

        try {
            // Check if user exists
            const checkResponse = await fetch(`${userDocPath}?key=${FIREBASE_CONFIG.apiKey}`, {
                headers: { 'Authorization': `Bearer ${this.firebaseToken}` }
            });

            if (checkResponse.status === 404) {
                // Create new user document
                await fetch(`${userDocPath}?key=${FIREBASE_CONFIG.apiKey}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.firebaseToken}`,
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
            } else if (checkResponse.ok) {
                // Update last login
                await fetch(`${userDocPath}?key=${FIREBASE_CONFIG.apiKey}&updateMask.fieldPaths=lastLogin`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.firebaseToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: {
                            lastLogin: { timestampValue: new Date().toISOString() }
                        }
                    })
                });
                console.log('[Auth] Updated user lastLogin');
            }
        } catch (error) {
            console.error('[Auth] Error creating user document:', error);
        }
    }

    // Sign out
    async signOut() {
        try {
            // Revoke Google token with Chrome
            if (this.googleToken) {
                await new Promise((resolve) => {
                    chrome.identity.removeCachedAuthToken({ token: this.googleToken }, resolve);
                });
            }

            this.user = null;
            this.googleToken = null;
            this.firebaseToken = null;

            // Clear from storage
            await chrome.storage.local.remove(['authUser', 'googleToken', 'firebaseToken']);

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

    // Get Firebase ID token (for Firestore API calls)
    getToken() {
        return this.firebaseToken;
    }

    // Check if signed in
    isSignedIn() {
        return this.user !== null && this.firebaseToken !== null;
    }
}

// Create global instance
const authManager = new AuthManager();

// Initialize on load
if (typeof window !== 'undefined') {
    window.authManager = authManager;
}
