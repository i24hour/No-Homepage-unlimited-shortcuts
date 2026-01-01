// DOM Elements
const shortcutsGrid = document.getElementById('shortcutsGrid');
const addBtn = document.getElementById('addBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const shortcutForm = document.getElementById('shortcutForm');
const linkNameInput = document.getElementById('linkName');
const linkUrlInput = document.getElementById('linkUrl');
const cancelBtn = document.getElementById('cancelBtn');
const contextMenu = document.getElementById('contextMenu');
const editItem = document.getElementById('editItem');
const deleteItem = document.getElementById('deleteItem');
const openFullBtn = document.getElementById('openFull');

// Auth DOM Elements
const authLoggedOut = document.getElementById('authLoggedOut');
const authLoggedIn = document.getElementById('authLoggedIn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const syncStatus = document.getElementById('syncStatus');
const syncText = document.getElementById('syncText');

// State
let shortcuts = [];
let editingId = null;
let selectedShortcutId = null;

// Initialize
document.addEventListener('DOMContentLoaded', loadShortcuts);

// Load shortcuts
function loadShortcuts() {
    chrome.storage.local.get(['shortcuts'], (result) => {
        shortcuts = result.shortcuts || [];
        renderShortcuts();
    });
}

// Save shortcuts (with cloud sync)
function saveShortcuts() {
    chrome.storage.local.set({ shortcuts }, () => {
        renderShortcuts();
        // Sync to cloud if logged in
        if (authManager && authManager.isSignedIn()) {
            syncToCloud();
        }
    });
}

// Sync to cloud
async function syncToCloud() {
    if (!syncManager || !authManager.isSignedIn()) return;

    updateSyncStatus('syncing', 'Syncing...');
    try {
        await syncManager.uploadToCloud();
        updateSyncStatus('synced', 'Synced');
    } catch (error) {
        updateSyncStatus('error', 'Sync failed');
    }
}

// Update sync status UI
function updateSyncStatus(status, text) {
    if (!syncStatus || !syncText) return;

    const icon = syncStatus.querySelector('.sync-icon');
    if (status === 'syncing') {
        syncStatus.classList.add('syncing');
        if (icon) icon.classList.add('spinning');
    } else {
        syncStatus.classList.remove('syncing');
        if (icon) icon.classList.remove('spinning');
    }
    syncText.textContent = text;
}

// Generate ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get favicon
function getFaviconUrl(url) {
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
        return null;
    }
}

// Render shortcuts
function renderShortcuts() {
    shortcutsGrid.innerHTML = '';

    if (shortcuts.length === 0) {
        shortcutsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p>No shortcuts yet</p>
      </div>
    `;
        return;
    }

    shortcuts.forEach(shortcut => {
        const card = document.createElement('div');
        card.className = 'shortcut-card';
        card.dataset.id = shortcut.id;
        card.dataset.url = shortcut.url;

        const favicon = getFaviconUrl(shortcut.url);
        const initial = shortcut.name.charAt(0).toUpperCase();

        card.innerHTML = `
      <div class="shortcut-icon">
        ${favicon
                ? `<img src="${favicon}" onerror="this.style.display='none'; this.parentElement.textContent='${initial}'">`
                : initial
            }
      </div>
      <span class="shortcut-name">${shortcut.name}</span>
    `;

        // Left click to open link
        card.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            chrome.tabs.create({ url: shortcut.url });
        });

        // Right click for context menu
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, shortcut.id);
        });

        shortcutsGrid.appendChild(card);
    });
}

// Context menu
function showContextMenu(e, id) {
    selectedShortcutId = id;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${Math.min(e.clientX, 200)}px`;
    contextMenu.classList.add('active');
}

function hideContextMenu() {
    contextMenu.classList.remove('active');
    selectedShortcutId = null;
}

// Modal
function openModal(isEdit = false) {
    modalOverlay.classList.add('active');

    if (isEdit && editingId) {
        const shortcut = shortcuts.find(s => s.id === editingId);
        if (shortcut) {
            modalTitle.textContent = 'Edit Shortcut';
            linkNameInput.value = shortcut.name;
            linkUrlInput.value = shortcut.url;
        }
    } else {
        modalTitle.textContent = 'Add Shortcut';
        linkNameInput.value = '';
        linkUrlInput.value = '';
        editingId = null;
    }

    setTimeout(() => linkNameInput.focus(), 50);
}

function closeModal() {
    modalOverlay.classList.remove('active');
    shortcutForm.reset();
    editingId = null;
}

// Form submit
function handleSubmit(e) {
    e.preventDefault();

    let url = linkUrlInput.value.trim();
    const name = linkNameInput.value.trim();

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    if (editingId) {
        const index = shortcuts.findIndex(s => s.id === editingId);
        if (index !== -1) {
            shortcuts[index] = { ...shortcuts[index], name, url };
        }
    } else {
        shortcuts.push({ id: generateId(), name, url });
    }

    saveShortcuts();
    closeModal();
}

// Delete
function deleteShortcut(id) {
    shortcuts = shortcuts.filter(s => s.id !== id);
    saveShortcuts();
}

// Event Listeners
addBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});
shortcutForm.addEventListener('submit', handleSubmit);

editItem.addEventListener('click', () => {
    if (selectedShortcutId) {
        editingId = selectedShortcutId;
        openModal(true);
    }
    hideContextMenu();
});

deleteItem.addEventListener('click', () => {
    if (selectedShortcutId) {
        deleteShortcut(selectedShortcutId);
    }
    hideContextMenu();
});

document.addEventListener('click', hideContextMenu);

// Open full page
openFullBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
});

// ==================== RAM SAVER SETTINGS ====================
const ramSaverToggle = document.getElementById('ramSaverToggle');
const ramSaverSettings = document.getElementById('ramSaverSettings');
const timeoutSlider = document.getElementById('timeoutSlider');
const timeoutValue = document.getElementById('timeoutValue');
const tabCountEl = document.getElementById('tabCount');
const addWhitelistBtn = document.getElementById('addWhitelistBtn');
const whitelistInputRow = document.getElementById('whitelistInputRow');
const whitelistInput = document.getElementById('whitelistInput');
const saveWhitelistBtn = document.getElementById('saveWhitelistBtn');
const whitelistList = document.getElementById('whitelistList');

// Load RAM Saver settings
function loadRamSaverSettings() {
    chrome.storage.local.get([
        'ramSaverEnabled',
        'inactiveTimeout',
        'whitelistedDomains',
        'tabLastActive'
    ], (result) => {
        // Set toggle state
        const isEnabled = result.ramSaverEnabled !== false; // Default true
        ramSaverToggle.checked = isEnabled;
        ramSaverSettings.style.opacity = isEnabled ? '1' : '0.5';
        ramSaverSettings.style.pointerEvents = isEnabled ? 'auto' : 'none';

        // Set timeout value
        const timeout = result.inactiveTimeout || 30;
        timeoutSlider.value = timeout;
        timeoutValue.textContent = timeout + ' min';

        // Set tab count
        const tabLastActive = result.tabLastActive || {};
        tabCountEl.textContent = Object.keys(tabLastActive).length;

        // Render whitelist
        renderWhitelist(result.whitelistedDomains || []);
    });
}

// Render whitelist tags
function renderWhitelist(domains) {
    if (domains.length === 0) {
        whitelistList.innerHTML = '<span class="whitelist-empty">No protected domains</span>';
        return;
    }

    whitelistList.innerHTML = domains.map(domain => `
        <span class="whitelist-tag">
            ${domain}
            <button class="whitelist-tag-remove" data-domain="${domain}">×</button>
        </span>
    `).join('');

    // Add remove handlers
    whitelistList.querySelectorAll('.whitelist-tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removeWhitelistDomain(btn.dataset.domain);
        });
    });
}

// Remove domain from whitelist
function removeWhitelistDomain(domain) {
    chrome.storage.local.get(['whitelistedDomains'], (result) => {
        const domains = (result.whitelistedDomains || []).filter(d => d !== domain);
        chrome.storage.local.set({ whitelistedDomains: domains }, () => {
            renderWhitelist(domains);
        });
    });
}

// Add domain to whitelist
function addWhitelistDomain(domain) {
    domain = domain.trim().toLowerCase();
    if (!domain) return;

    // Remove http/https and trailing slashes
    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    chrome.storage.local.get(['whitelistedDomains'], (result) => {
        const domains = result.whitelistedDomains || [];
        if (!domains.includes(domain)) {
            domains.push(domain);
            chrome.storage.local.set({ whitelistedDomains: domains }, () => {
                renderWhitelist(domains);
                whitelistInput.value = '';
                whitelistInputRow.classList.remove('active');
            });
        }
    });
}

// Toggle RAM Saver
ramSaverToggle.addEventListener('change', () => {
    const isEnabled = ramSaverToggle.checked;
    chrome.storage.local.set({ ramSaverEnabled: isEnabled });
    ramSaverSettings.style.opacity = isEnabled ? '1' : '0.5';
    ramSaverSettings.style.pointerEvents = isEnabled ? 'auto' : 'none';
});

// Timeout slider
timeoutSlider.addEventListener('input', () => {
    const value = parseInt(timeoutSlider.value);
    timeoutValue.textContent = value + ' min';
});

timeoutSlider.addEventListener('change', () => {
    const value = parseInt(timeoutSlider.value);
    chrome.storage.local.set({ inactiveTimeout: value });
});

// Whitelist add button
addWhitelistBtn.addEventListener('click', () => {
    whitelistInputRow.classList.toggle('active');
    if (whitelistInputRow.classList.contains('active')) {
        whitelistInput.focus();
    }
});

// Save whitelist domain
saveWhitelistBtn.addEventListener('click', () => {
    addWhitelistDomain(whitelistInput.value);
});

// Enter key to add domain
whitelistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addWhitelistDomain(whitelistInput.value);
    }
});

// Load settings on popup open
loadRamSaverSettings();

// Update tab count periodically
setInterval(() => {
    chrome.storage.local.get(['tabLastActive'], (result) => {
        const tabLastActive = result.tabLastActive || {};
        tabCountEl.textContent = Object.keys(tabLastActive).length;
    });
}, 2000);

// ==================== AUTHENTICATION ====================

// Initialize auth
async function initAuth() {
    if (!authManager) {
        console.log('[Auth] Auth manager not loaded');
        return;
    }

    await authManager.init();

    // Listen for auth state changes
    authManager.onAuthStateChanged(handleAuthStateChange);
}

// Handle auth state change
function handleAuthStateChange(user) {
    if (user) {
        // User is signed in
        authLoggedOut.style.display = 'none';
        authLoggedIn.style.display = 'block';

        userName.textContent = user.displayName || 'User';
        userEmail.textContent = user.email;
        userAvatar.src = user.photoURL || '';
        userAvatar.style.display = user.photoURL ? 'block' : 'none';

        // Perform initial sync
        performInitialSync();
    } else {
        // User is signed out
        authLoggedOut.style.display = 'block';
        authLoggedIn.style.display = 'none';
    }
}

// Perform initial sync on login
async function performInitialSync() {
    if (!syncManager) return;

    updateSyncStatus('syncing', 'Syncing...');
    try {
        await syncManager.performFullSync();
        // Reload shortcuts after sync
        loadShortcuts();
        loadRamSaverSettings();
        updateSyncStatus('synced', 'Synced');
    } catch (error) {
        console.error('[Sync] Initial sync error:', error);
        updateSyncStatus('error', 'Sync failed');
    }
}

// Sign in button
if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
        try {
            googleSignInBtn.disabled = true;
            googleSignInBtn.textContent = 'Signing in...';
            await authManager.signIn();
        } catch (error) {
            console.error('[Auth] Sign in error:', error);
            alert('Sign in failed: ' + error.message);
        } finally {
            googleSignInBtn.disabled = false;
            googleSignInBtn.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
            `;
        }
    });
}

// Sign out button
if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
        try {
            await authManager.signOut();
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
        }
    });
}

// Initialize auth on load
initAuth();
