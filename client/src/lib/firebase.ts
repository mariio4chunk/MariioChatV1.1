import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaByBmwyM4DZcceBR-UZgmcWmOLNkYT4",
  authDomain: "mario-chatt.firebaseapp.com",
  projectId: "mario-chatt",
  storageBucket: "mario-chatt.firebasestorage.app",
  messagingSenderId: "549135172436",
  appId: "1:549135172436:web:d165b694bb9a6eb4ecbec1",
  measurementId: "G-7MBBGJMHE"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const signInWithGithub = () => {
  return signInWithPopup(auth, githubProvider);
};

export const logout = () => {
  return signOut(auth);
};