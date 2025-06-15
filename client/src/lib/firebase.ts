
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Firebase configuration - pastikan konfigurasi ini benar
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
    // Bersihkan provider sebelum menggunakan
    googleProvider.setCustomParameters({
      prompt: 'select_account',
      access_type: 'offline'
    });

    // Set scope yang diperlukan
    googleProvider.addScope('email');
    googleProvider.addScope('profile');

    const result = await signInWithPopup(auth, googleProvider);
    
    if (!result.user) {
      throw new Error("Tidak ada user yang diterima dari Google");
    }

    console.log("Login berhasil:", result.user.displayName);
    return result.user;
    
  } catch (error: any) {
    console.error("Error detail:", error);
    
    // Handle berbagai jenis error
    if (error.code === 'auth/popup-closed-by-user') {
      console.log("Login popup ditutup oleh user");
      return null;
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error("Popup diblokir browser. Izinkan popup untuk website ini.");
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error("Koneksi internet bermasalah. Coba lagi.");
    } else if (error.code === 'auth/invalid-api-key') {
      throw new Error("Konfigurasi Firebase tidak valid. Hubungi developer.");
    } else if (error.code === 'auth/cancelled-popup-request') {
      console.log("Request popup dibatalkan");
      return null;
    }
    
    throw new Error(error.message || "Terjadi kesalahan saat login. Coba lagi.");
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    console.log("Logout berhasil");
  } catch (error: any) {
    console.error("Error signing out:", error);
    throw new Error("Gagal logout. Coba lagi.");
  }
};
