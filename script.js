// DOM Elements
const shortcutsGrid = document.getElementById('shortcutsGrid');
const addBtn = document.getElementById('addBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const shortcutForm = document.getElementById('shortcutForm');
const linkNameInput = document.getElementById('linkName');
const linkUrlInput = document.getElementById('linkUrl');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const contextMenu = document.getElementById('contextMenu');
const editItem = document.getElementById('editItem');
const deleteItem = document.getElementById('deleteItem');
const greetingEl = document.getElementById('greeting');
const dateEl = document.getElementById('currentDate');

// State
let shortcuts = [];
let editingId = null;
let selectedShortcutId = null;
let draggedItem = null;
let draggedIndex = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadShortcuts();
  updateGreeting();
  updateDate();
});

// Update greeting based on time
function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good Evening';

  if (hour >= 5 && hour < 12) {
    greeting = 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon';
  }

  greetingEl.textContent = greeting;
}

// Update current date
function updateDate() {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  dateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

// Load shortcuts from storage
function loadShortcuts() {
  chrome.storage.local.get(['shortcuts'], (result) => {
    shortcuts = result.shortcuts || [];
    renderShortcuts();
  });
}

// Save shortcuts to storage
function saveShortcuts() {
  chrome.storage.local.set({ shortcuts }, () => {
    renderShortcuts();
  });
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get favicon URL
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

// Get first letter for icon fallback
function getInitial(name) {
  return name.charAt(0).toUpperCase();
}

// Render shortcuts
function renderShortcuts() {
  shortcutsGrid.innerHTML = '';

  if (shortcuts.length === 0) {
    shortcutsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        <h3>No shortcuts yet</h3>
        <p>Click "Add Shortcut" to add your favorite links</p>
      </div>
    `;
    return;
  }

  shortcuts.forEach((shortcut, index) => {
    const card = document.createElement('div');
    card.className = 'shortcut-card';
    card.dataset.id = shortcut.id;
    card.dataset.index = index;
    card.draggable = true;
    card.style.animationDelay = `${index * 0.05}s`;

    const faviconUrl = getFaviconUrl(shortcut.url);

    card.innerHTML = `
      <div class="card-actions">
        <button class="card-action-btn edit-btn" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="card-action-btn delete delete-btn" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      <div class="shortcut-icon">
        ${faviconUrl
        ? `<img src="${faviconUrl}" alt="${shortcut.name}" onerror="this.style.display='none'; this.parentElement.textContent='${getInitial(shortcut.name)}'">`
        : getInitial(shortcut.name)
      }
      </div>
      <span class="shortcut-name">${shortcut.name}</span>
    `;

    // Drag start
    card.addEventListener('dragstart', (e) => {
      draggedItem = card;
      draggedIndex = index;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    // Drag over
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const targetIndex = parseInt(card.dataset.index);
      if (draggedIndex !== null && draggedIndex !== targetIndex) {
        card.classList.add('drag-over');
      }
    });

    // Drag leave
    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    // Drop
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetIndex = parseInt(card.dataset.index);
      if (draggedIndex !== null && draggedIndex !== targetIndex) {
        // Reorder shortcuts array
        const [movedItem] = shortcuts.splice(draggedIndex, 1);
        shortcuts.splice(targetIndex, 0, movedItem);
        saveShortcuts();
      }
    });

    // Drag end
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedItem = null;
      draggedIndex = null;
      // Remove drag-over from all cards
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    // Click on card to open link
    card.addEventListener('click', (e) => {
      // Don't open link if clicking on action buttons or during drag
      if (e.target.closest('.card-actions')) return;
      if (card.classList.contains('dragging')) return;
      window.location.href = shortcut.url;
    });

    // Edit button click
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      editingId = shortcut.id;
      openModal(true);
    });

    // Delete button click
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteShortcut(shortcut.id);
    });

    // Right-click context menu
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, shortcut.id);
    });

    shortcutsGrid.appendChild(card);
  });
}

// Show context menu
function showContextMenu(e, id) {
  selectedShortcutId = id;
  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.classList.add('active');
}

// Hide context menu
function hideContextMenu() {
  contextMenu.classList.remove('active');
  selectedShortcutId = null;
}

// Open modal
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
    modalTitle.textContent = 'Add New Shortcut';
    linkNameInput.value = '';
    linkUrlInput.value = '';
    editingId = null;
  }

  setTimeout(() => linkNameInput.focus(), 100);
}

// Close modal
function closeModalFn() {
  modalOverlay.classList.remove('active');
  shortcutForm.reset();
  editingId = null;
}

// Handle form submission
function handleSubmit(e) {
  e.preventDefault();

  let url = linkUrlInput.value.trim();
  const name = linkNameInput.value.trim();

  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  if (editingId) {
    // Update existing shortcut
    const index = shortcuts.findIndex(s => s.id === editingId);
    if (index !== -1) {
      shortcuts[index] = { ...shortcuts[index], name, url };
    }
  } else {
    // Add new shortcut
    shortcuts.push({
      id: generateId(),
      name,
      url
    });
  }

  saveShortcuts();
  closeModalFn();
}

// Delete shortcut
function deleteShortcut(id) {
  shortcuts = shortcuts.filter(s => s.id !== id);
  saveShortcuts();
}

// Event Listeners
addBtn.addEventListener('click', () => openModal());

closeModal.addEventListener('click', closeModalFn);
cancelBtn.addEventListener('click', closeModalFn);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModalFn();
  }
});

shortcutForm.addEventListener('submit', handleSubmit);

// Context menu actions
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

// Hide context menu on click outside
document.addEventListener('click', () => {
  hideContextMenu();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModalFn();
    hideContextMenu();
  }
});
