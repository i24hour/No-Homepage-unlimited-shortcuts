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

// Save shortcuts
function saveShortcuts() {
    chrome.storage.local.set({ shortcuts }, renderShortcuts);
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
