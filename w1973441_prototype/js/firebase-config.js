// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBE8CvNtJ2wqi8LHUuMeOzl6J-t2a83zpc",
  authDomain: "questify-6489b.firebaseapp.com",
  projectId: "questify-6489b",
  storageBucket: "questify-6489b.firebasestorage.app",
  messagingSenderId: "215872912603",
  appId: "1:215872912603:web:34d3d4e1cef757c1cda0fe",
  measurementId: "G-KX2Q6H3K0C"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  doc,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection
};
