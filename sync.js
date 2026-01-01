// Cloud Sync Module for iCTrL Extension
// Syncs shortcuts and settings with Firestore

class SyncManager {
    constructor() {
        this.isSyncing = false;
        this.lastSyncTime = null;
    }

    // Get auth token from authManager
    getToken() {
        return authManager ? authManager.getToken() : null;
    }

    // Get current user ID
    getUserId() {
        const user = authManager ? authManager.getCurrentUser() : null;
        return user ? user.uid : null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return authManager ? authManager.isSignedIn() : false;
    }

    // ==================== SHORTCUTS SYNC ====================

    // Save shortcuts to Firestore
    async saveShortcutsToCloud(shortcuts) {
        if (!this.isAuthenticated()) {
            console.log('[Sync] Not authenticated, skipping cloud save');
            return false;
        }

        const userId = this.getUserId();
        const token = this.getToken();
        const docPath = `${FIRESTORE_BASE_URL}/users/${userId}/data/shortcuts`;

        try {
            const shortcutsArray = shortcuts.map(s => ({
                mapValue: {
                    fields: {
                        id: { stringValue: s.id },
                        name: { stringValue: s.name },
                        url: { stringValue: s.url }
                    }
                }
            }));

            await fetch(docPath, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        items: { arrayValue: { values: shortcutsArray } },
                        updatedAt: { timestampValue: new Date().toISOString() }
                    }
                })
            });

            console.log('[Sync] Shortcuts saved to cloud');
            return true;
        } catch (error) {
            console.error('[Sync] Error saving shortcuts:', error);
            return false;
        }
    }

    // Load shortcuts from Firestore
    async loadShortcutsFromCloud() {
        if (!this.isAuthenticated()) {
            console.log('[Sync] Not authenticated, skipping cloud load');
            return null;
        }

        const userId = this.getUserId();
        const token = this.getToken();
        const docPath = `${FIRESTORE_BASE_URL}/users/${userId}/data/shortcuts`;

        try {
            const response = await fetch(docPath, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 404) {
                console.log('[Sync] No cloud shortcuts found');
                return [];
            }

            if (!response.ok) {
                throw new Error('Failed to fetch shortcuts');
            }

            const data = await response.json();

            if (!data.fields || !data.fields.items || !data.fields.items.arrayValue) {
                return [];
            }

            const shortcuts = data.fields.items.arrayValue.values?.map(item => ({
                id: item.mapValue.fields.id.stringValue,
                name: item.mapValue.fields.name.stringValue,
                url: item.mapValue.fields.url.stringValue
            })) || [];

            console.log('[Sync] Loaded', shortcuts.length, 'shortcuts from cloud');
            return shortcuts;
        } catch (error) {
            console.error('[Sync] Error loading shortcuts:', error);
            return null;
        }
    }

    // ==================== SETTINGS SYNC ====================

    // Save settings to Firestore
    async saveSettingsToCloud(settings) {
        if (!this.isAuthenticated()) {
            return false;
        }

        const userId = this.getUserId();
        const token = this.getToken();
        const docPath = `${FIRESTORE_BASE_URL}/users/${userId}/data/settings`;

        try {
            const whitelistArray = (settings.whitelistedDomains || []).map(d => ({
                stringValue: d
            }));

            await fetch(docPath, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        ramSaverEnabled: { booleanValue: settings.ramSaverEnabled !== false },
                        inactiveTimeout: { integerValue: settings.inactiveTimeout || 30 },
                        whitelistedDomains: { arrayValue: { values: whitelistArray } },
                        updatedAt: { timestampValue: new Date().toISOString() }
                    }
                })
            });

            console.log('[Sync] Settings saved to cloud');
            return true;
        } catch (error) {
            console.error('[Sync] Error saving settings:', error);
            return false;
        }
    }

    // Load settings from Firestore
    async loadSettingsFromCloud() {
        if (!this.isAuthenticated()) {
            return null;
        }

        const userId = this.getUserId();
        const token = this.getToken();
        const docPath = `${FIRESTORE_BASE_URL}/users/${userId}/data/settings`;

        try {
            const response = await fetch(docPath, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }

            const data = await response.json();

            if (!data.fields) {
                return null;
            }

            const settings = {
                ramSaverEnabled: data.fields.ramSaverEnabled?.booleanValue ?? true,
                inactiveTimeout: parseInt(data.fields.inactiveTimeout?.integerValue || '30'),
                whitelistedDomains: data.fields.whitelistedDomains?.arrayValue?.values?.map(
                    v => v.stringValue
                ) || []
            };

            console.log('[Sync] Loaded settings from cloud');
            return settings;
        } catch (error) {
            console.error('[Sync] Error loading settings:', error);
            return null;
        }
    }

    // ==================== FULL SYNC ====================

    // Perform full sync (download from cloud and merge with local)
    async performFullSync() {
        if (this.isSyncing) {
            console.log('[Sync] Already syncing, skipping');
            return;
        }

        if (!this.isAuthenticated()) {
            console.log('[Sync] Not authenticated, skipping sync');
            return;
        }

        this.isSyncing = true;
        console.log('[Sync] Starting full sync...');

        try {
            // Load from cloud
            const cloudShortcuts = await this.loadShortcutsFromCloud();
            const cloudSettings = await this.loadSettingsFromCloud();

            // Get local data
            const localData = await chrome.storage.local.get([
                'shortcuts',
                'ramSaverEnabled',
                'inactiveTimeout',
                'whitelistedDomains',
                'lastCloudSync'
            ]);

            // Merge shortcuts (cloud takes priority for now)
            if (cloudShortcuts && cloudShortcuts.length > 0) {
                await chrome.storage.local.set({ shortcuts: cloudShortcuts });
                console.log('[Sync] Synced shortcuts from cloud');
            } else if (localData.shortcuts && localData.shortcuts.length > 0) {
                // Upload local to cloud if cloud is empty
                await this.saveShortcutsToCloud(localData.shortcuts);
            }

            // Merge settings (cloud takes priority)
            if (cloudSettings) {
                await chrome.storage.local.set({
                    ramSaverEnabled: cloudSettings.ramSaverEnabled,
                    inactiveTimeout: cloudSettings.inactiveTimeout,
                    whitelistedDomains: cloudSettings.whitelistedDomains
                });
                console.log('[Sync] Synced settings from cloud');
            } else {
                // Upload local settings to cloud
                await this.saveSettingsToCloud({
                    ramSaverEnabled: localData.ramSaverEnabled,
                    inactiveTimeout: localData.inactiveTimeout,
                    whitelistedDomains: localData.whitelistedDomains
                });
            }

            // Update last sync time
            this.lastSyncTime = new Date().toISOString();
            await chrome.storage.local.set({ lastCloudSync: this.lastSyncTime });

            console.log('[Sync] Full sync completed');
        } catch (error) {
            console.error('[Sync] Full sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    // Upload local data to cloud (called when saving locally)
    async uploadToCloud() {
        if (!this.isAuthenticated()) return;

        const localData = await chrome.storage.local.get([
            'shortcuts',
            'ramSaverEnabled',
            'inactiveTimeout',
            'whitelistedDomains'
        ]);

        // Save shortcuts
        if (localData.shortcuts) {
            await this.saveShortcutsToCloud(localData.shortcuts);
        }

        // Save settings
        await this.saveSettingsToCloud({
            ramSaverEnabled: localData.ramSaverEnabled,
            inactiveTimeout: localData.inactiveTimeout,
            whitelistedDomains: localData.whitelistedDomains
        });
    }
}

// Create global instance
const syncManager = new SyncManager();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.syncManager = syncManager;
}
