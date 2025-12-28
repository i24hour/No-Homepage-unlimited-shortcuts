// Background service worker for Quick Link Shortcuts
// Includes: Keyboard shortcuts + RAM Saver (Auto-close inactive tabs)

// ==================== KEYBOARD SHORTCUTS ====================
chrome.commands.onCommand.addListener((command) => {
    if (command === "open-full-page") {
        chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
    }
});

// ==================== RAM SAVER FEATURE ====================
// Track last active time for each tab

// Initialize on extension install/update
chrome.runtime.onInstalled.addListener(() => {
    // Set default settings
    chrome.storage.local.get(['ramSaverEnabled', 'inactiveTimeout', 'whitelistedDomains'], (result) => {
        const defaults = {};
        if (result.ramSaverEnabled === undefined) defaults.ramSaverEnabled = true;
        if (result.inactiveTimeout === undefined) defaults.inactiveTimeout = 30;
        if (result.whitelistedDomains === undefined) defaults.whitelistedDomains = [];

        if (Object.keys(defaults).length > 0) {
            chrome.storage.local.set(defaults);
        }
    });

    // Initialize all existing tabs with current time
    initializeTabTracking();

    // Create alarm for checking inactive tabs (runs every 1 minute)
    chrome.alarms.create('checkInactiveTabs', { periodInMinutes: 1 });
});

// Also initialize on browser startup
chrome.runtime.onStartup.addListener(() => {
    initializeTabTracking();
    chrome.alarms.create('checkInactiveTabs', { periodInMinutes: 1 });
});

// Initialize tab tracking
async function initializeTabTracking() {
    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    const tabLastActive = {};

    tabs.forEach(tab => {
        tabLastActive[tab.id] = now;
    });

    await chrome.storage.local.set({ tabLastActive });
    console.log('[RAM Saver] Initialized tracking for', tabs.length, 'tabs');
}

// Track when tab becomes active (user switches to it)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const result = await chrome.storage.local.get(['tabLastActive']);
    const tabLastActive = result.tabLastActive || {};

    tabLastActive[activeInfo.tabId] = Date.now();
    await chrome.storage.local.set({ tabLastActive });
});

// Track when tab content is updated (page refresh/navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        const result = await chrome.storage.local.get(['tabLastActive']);
        const tabLastActive = result.tabLastActive || {};

        tabLastActive[tabId] = Date.now();
        await chrome.storage.local.set({ tabLastActive });
    }
});

// Track when new tab is created
chrome.tabs.onCreated.addListener(async (tab) => {
    const result = await chrome.storage.local.get(['tabLastActive']);
    const tabLastActive = result.tabLastActive || {};

    tabLastActive[tab.id] = Date.now();
    await chrome.storage.local.set({ tabLastActive });
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
    const result = await chrome.storage.local.get(['tabLastActive']);
    const tabLastActive = result.tabLastActive || {};

    delete tabLastActive[tabId];
    await chrome.storage.local.set({ tabLastActive });
});

// Check and close inactive tabs (runs every minute via alarm)
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'checkInactiveTabs') return;

    const result = await chrome.storage.local.get([
        'ramSaverEnabled',
        'inactiveTimeout',
        'whitelistedDomains',
        'tabLastActive'
    ]);

    // If feature is disabled, do nothing
    if (!result.ramSaverEnabled) {
        console.log('[RAM Saver] Feature is disabled');
        return;
    }

    let tabLastActive = result.tabLastActive || {};
    const timeoutMinutes = result.inactiveTimeout || 30;
    const timeoutMs = timeoutMinutes * 60 * 1000; // Convert to milliseconds
    const whitelist = result.whitelistedDomains || [];
    const now = Date.now();

    const tabs = await chrome.tabs.query({});

    // If no tabs are being tracked, initialize them now
    if (Object.keys(tabLastActive).length === 0 && tabs.length > 0) {
        console.log('[RAM Saver] Initializing tab tracking...');
        tabs.forEach(tab => {
            tabLastActive[tab.id] = now;
        });
        await chrome.storage.local.set({ tabLastActive });
        console.log('[RAM Saver] Now tracking', tabs.length, 'tabs');
        return; // Skip closing on first run after init
    }
    let closedCount = 0;

    for (const tab of tabs) {
        // Skip pinned tabs - they are protected
        if (tab.pinned) continue;

        // Skip extension pages
        if (tab.url && tab.url.startsWith('chrome://')) continue;
        if (tab.url && tab.url.startsWith('chrome-extension://')) continue;

        // Skip whitelisted domains
        if (isWhitelisted(tab.url, whitelist)) continue;

        // Skip the currently active tab in each window
        if (tab.active) {
            tabLastActive[tab.id] = now; // Refresh active tab timestamp
            continue;
        }

        // Check if tab has been inactive for too long
        const lastActive = tabLastActive[tab.id] || now;
        const inactiveTime = now - lastActive;

        if (inactiveTime > timeoutMs) {
            console.log(`[RAM Saver] Closing inactive tab (${Math.round(inactiveTime / 60000)} min): ${tab.title}`);
            try {
                await chrome.tabs.remove(tab.id);
                delete tabLastActive[tab.id];
                closedCount++;
            } catch (e) {
                console.log('[RAM Saver] Failed to close tab:', e.message);
            }
        }
    }

    if (closedCount > 0) {
        console.log(`[RAM Saver] Closed ${closedCount} inactive tab(s)`);
    }

    // Update storage
    await chrome.storage.local.set({ tabLastActive });
});

// Check if URL matches any whitelisted domain
function isWhitelisted(url, whitelist) {
    if (!url || !whitelist || whitelist.length === 0) return false;

    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return whitelist.some(domain => {
            const d = domain.toLowerCase().trim();
            return hostname === d || hostname.endsWith('.' + d);
        });
    } catch {
        return false;
    }
}
