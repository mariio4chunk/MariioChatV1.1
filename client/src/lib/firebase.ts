import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsmyMOJ4Dzcx85R-U2gHWcWMoRLNhXfT4",
  authDomain: "mariio-chatt.firebaseapp.com",
  projectId: "mariio-chatt",
  storageBucket: "mariio-chatt.firebasestorage.app",
  messagingSenderId: "549135172436",
  appId: "1:549135172436:web:d165b694bb9a6eb66ebec1",
  measurementId: "G-7MBBGJMHE"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const logout = () => {
  return signOut(auth);
};