# iCTrL - Tab Control & Quick Links

<div align="center">
  <h3>🎮 Take Control of Your Browser Experience</h3>
  <p>A powerful Chrome extension for quick link shortcuts and intelligent RAM management</p>
</div>

---

## ✨ Features

### 🔗 Quick Link Shortcuts
- Add unlimited custom shortcuts to your new tab page
- Beautiful, responsive grid layout
- Automatic favicon detection
- Quick access from popup or full-page view
- Edit and delete shortcuts with right-click context menu

### 🧠 RAM Saver (Auto-Close Inactive Tabs)
- Automatically closes tabs that haven't been viewed for a set time
- Configurable timeout (5-120 minutes)
- Works even when you're in other apps
- Smart protections:
  - 📌 Pinned tabs are never closed
  - ⭐ Active tab is always safe
  - � Whitelist your favorite domains
  - 🔧 Chrome system pages are protected

### ⌨️ Keyboard Shortcuts
- **Ctrl+Shift+L** (Windows/Linux) or **Cmd+Shift+L** (Mac) - Open full page

---

## �️ Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](#) (link coming soon)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Copy `firebase-config.example.js` to `firebase-config.js`
3. Add your Firebase credentials to `firebase-config.js`
4. Update `manifest.json` with your OAuth Client ID
5. Open Chrome and go to `chrome://extensions`
6. Enable **Developer mode** (toggle in top right)
7. Click **Load unpacked**
8. Select the extension folder

---

## 🔧 Firebase Setup (For Cloud Sync)

To enable Google Sign-In and Cloud Sync:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Google Authentication
3. Create a Firestore Database
4. Get your Firebase config and add to `firebase-config.js`
5. Create OAuth Client ID in Google Cloud Console for Chrome Extension
6. Add your Client ID to `manifest.json`

---

## 📋 Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Save your shortcuts and settings locally |
| `tabs` | Track tab activity for RAM Saver & open shortcuts |
| `alarms` | Run periodic checks for inactive tabs |
| `identity` | Google Sign-In for Cloud Sync |

**Privacy First:** Your data is stored locally or in your own Firebase project. No external servers, no tracking, no analytics.

---

## 🎯 How to Use

### Adding Shortcuts
1. Click the extension icon or open a new tab
2. Click "Add Shortcut" button
3. Enter name and URL
4. Click Save

### RAM Saver Settings
1. Click the extension icon
2. Scroll to "RAM Saver" section
3. Toggle on/off as needed
4. Adjust timeout with slider (5-120 min)
5. Add protected domains to whitelist

### Cloud Sync
1. Click "Sign in with Google" in the popup
2. Your shortcuts and settings will sync across devices
3. Sign in on any device to access your data

### Editing/Deleting Shortcuts
Right-click any shortcut to edit or delete it.

---

## 🔐 Privacy

iCTrL respects your privacy:
- ✅ All data stored locally or in your own Firebase
- ✅ No data collection or transmission to third parties
- ✅ No analytics or tracking
- ✅ Open source and transparent

Read our full [Privacy Policy](privacy-policy.html)

---

## 📝 Changelog

### v1.1.0 (January 2026)
- ✨ **NEW:** Cloud Sync - Sign in with Google to sync shortcuts across devices
- ✨ **NEW:** Firebase Authentication integration
- 🔧 Improved error handling

### v1.0.0 (December 2025)
- Initial release
- Quick Link Shortcuts feature
- RAM Saver with auto-close functionality
- Customizable timeout and domain whitelist
- Beautiful dark theme UI

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

## 📄 License

MIT License - Feel free to use and modify.

---

## � Contact

For support or questions: **priyanshu85953@gmail.com**

---

<div align="center">
  <p>Made with ❤️ for a better browsing experience</p>
  <p><strong>iCTrL</strong> - Control Your Browser</p>
</div>
