// Firebase Configuration for iCTrL Extension
// COPY THIS FILE TO firebase-config.js AND ADD YOUR CREDENTIALS
// Uses Firebase REST APIs for Manifest V3 compatibility

const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firestore REST API base URL
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

// Firestore URL with API key (for when rules allow public access)
const FIRESTORE_API_KEY_URL = `${FIRESTORE_BASE_URL}?key=${FIREBASE_CONFIG.apiKey}`;

// Export for use in other files
if (typeof window !== 'undefined') {
    window.FIREBASE_CONFIG = FIREBASE_CONFIG;
    window.FIRESTORE_BASE_URL = FIRESTORE_BASE_URL;
    window.FIRESTORE_API_KEY_URL = FIRESTORE_API_KEY_URL;
}
