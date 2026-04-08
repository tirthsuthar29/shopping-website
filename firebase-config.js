// firebase-config.js
// Firebase configuration for NOVATECH


// Initialize Firebase (Compat version)
firebase.initializeApp(firebaseConfig);
console.log("ðŸ”¥ Firebase initialized successfully!");

// Make available globally
window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = (typeof firebase.storage === "function") ? firebase.storage() : null;

const auth = window.auth;
const db = window.db;
const storage = window.storage;

// Export for module use if needed, but primarily used as a script tag
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth, db, storage };
}
