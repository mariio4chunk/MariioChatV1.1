import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaBySsKmpVQ4DZcc8eR-UpGgmCKWcKLNXfT4",
  authDomain: "mario-chatt.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mario-chatt",
  storageBucket: "mario-chatt.firebasestorage.app",
  messagingSenderId: "549135172436",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:549135172436:web:d165b694bb9a6eb4ecbec1",
  measurementId: "G-7MM8GRJMHE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  return signInWithPopup(auth, provider);
};

export const logout = () => {
  return signOut(auth);
};