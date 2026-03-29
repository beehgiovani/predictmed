import { initializeApp } from 'firebase/app';
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBwY2bR3gsimhB5aKCS_o3_G4FhEN1j15E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "predictmed-94729.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "predictmed-94729",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "predictmed-94729.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "217267041730",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:217267041730:web:014fe2a7c38aee4b0bd25b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HPD5YSCS8N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// const analytics = getAnalytics(app); // Opcional

export default app;
