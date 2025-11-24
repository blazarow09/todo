import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Placeholder configuration - User needs to update this with real keys
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC0B6VhykUdy3X4ewr2e-x4nwB0kf_10WM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "my-tasks-1bb0c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "my-tasks-1bb0c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "my-tasks-1bb0c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "252954626598",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:252954626598:web:b8420b43f1d81fc5f8f4e7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-21VHRK8WYE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.warn('Firebase persistence failed-precondition: multiple tabs open');
  } else if (err.code == 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Firebase persistence unimplemented in this browser');
  }
});

export { db, auth, googleProvider };

