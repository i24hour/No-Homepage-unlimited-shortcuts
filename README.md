# No Homepage + Unlimited Shortcuts

A beautiful Chrome/Brave browser extension that lets you add unlimited shortcut links on your new tab page.

![GitHub](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- **Unlimited Shortcuts** - Add as many links as you want
- **Drag & Drop** - Reorder shortcuts by dragging
- **Edit & Delete** - Hover over any shortcut to see edit/delete buttons
- **Beautiful Dark Theme** - GitHub-inspired dark mode design
- **Keyboard Shortcut** - Press `⌘ + Shift + L` (Mac) or `Ctrl + Shift + L` (Win) to open full page
- **Popup Access** - Click extension icon for quick access
- **Auto Favicons** - Automatically fetches website icons
- **Persistent Storage** - Shortcuts are saved locally

## 📸 Screenshots

| Full Page | Popup |
|-----------|-------|
| Clean, minimal new tab page with your shortcuts | Quick access popup from toolbar |

## 🚀 Installation

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/i24hour/No-Homepage-unlimited-shortcuts.git
   ```
2. Open Chrome/Brave and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the cloned folder

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + Shift + L` | Open full page shortcuts |
| Click extension icon | Open popup |
| Right-click shortcut | Edit/Delete menu |

## 🎨 Customization

The extension uses CSS variables for theming. Edit `styles.css` to customize:

```css
:root {
  --bg-primary: #0d1117;
  --accent-primary: #58a6ff;
  --accent-green: #238636;
  /* ... more variables */
}
```

## 📁 File Structure

```
├── manifest.json    # Extension configuration
├── newtab.html      # Full page layout
├── popup.html       # Popup layout
├── styles.css       # Full page styles
├── script.js        # Full page logic
├── popup.js         # Popup logic
└── background.js    # Keyboard shortcuts handler
```

## 🛠️ Built With

- Vanilla JavaScript
- HTML5 Drag & Drop API
- Chrome Extension Manifest V3
- Chrome Storage API

## 📄 License

MIT License - feel free to use and modify!

## 👤 Author

**Priyanshu** - [@i24hour](https://github.com/i24hour)

---

⭐ Star this repo if you find it useful!
