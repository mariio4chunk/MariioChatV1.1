import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Firebase configuration berdasarkan service account yang ada
const firebaseConfig = {
  apiKey: "AIzaSyB5O8X6Z5cq9X5Bc4VjQm3L9m4Zr8h2Y6k",
  authDomain: "mariio-chatt.firebaseapp.com",
  projectId: "mariio-chatt",
  storageBucket: "mariio-chatt.appspot.com",
  messagingSenderId: "103941801706941889256",
  appId: "1:103941801706941889256:web:5b8e8c6f7d9e0a1b2c3d4e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log("Login popup was closed by user");
      return null;
    }
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};