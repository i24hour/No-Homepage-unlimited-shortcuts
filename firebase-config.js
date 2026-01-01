// Firebase Configuration for iCTrL Extension
// Uses Firebase REST APIs for Manifest V3 compatibility

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA_C065eCZsgys9r7pSOHSUVgGtJcnqh24",
    authDomain: "ictrl-8f136.firebaseapp.com",
    projectId: "ictrl-8f136",
    storageBucket: "ictrl-8f136.firebasestorage.app",
    messagingSenderId: "158430504218",
    appId: "1:158430504218:web:69fd5f499c897525ebb8a3"
};

// Firestore REST API base URL
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

// Export for use in other files
if (typeof window !== 'undefined') {
    window.FIREBASE_CONFIG = FIREBASE_CONFIG;
    window.FIRESTORE_BASE_URL = FIRESTORE_BASE_URL;
}
