
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Temporary configuration - replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
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
    
    // For development/demo purposes, we'll simulate a successful login
    if (process.env.NODE_ENV === 'development') {
      // Create a mock user object for development
      const mockUser = {
        uid: 'demo-user-' + Date.now(),
        displayName: 'Demo User',
        email: 'demo@example.com',
        photoURL: null
      };
      return mockUser;
    }
    
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
    if (process.env.NODE_ENV === 'development') {
      // For development, just reload the page
      window.location.reload();
      return;
    }
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
