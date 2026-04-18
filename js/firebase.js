/**
 * Firebase initialization - Al Hussainy FC
 * Uses Firebase Compat SDK (works with regular script tags)
 */
const firebaseConfig = {
  apiKey: "AIzaSyAWAVnSSSJxG6QwzgtxVeg3GFUqLaevuE0",
  authDomain: "al-hussainy-fc.firebaseapp.com",
  projectId: "al-hussainy-fc",
  storageBucket: "al-hussainy-fc.firebasestorage.app",
  messagingSenderId: "470711290970",
  appId: "1:470711290970:web:fd0dfcf8c7201cf5ee1c63",
  measurementId: "G-QTC5HHBG63"
};

// Initialize Firebase app (compat mode)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export Firestore instance as global
const _firestoreDB = firebase.firestore();

// [NEW] Set session persistence to SESSION so user must log in again after closing browser
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });
