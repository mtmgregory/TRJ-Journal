// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, orderBy, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCd3XkfF6jyuGyQMsFCPe1NzM0TMzSsapA",
  authDomain: "court-craft-journal.firebaseapp.com",
  projectId: "court-craft-journal",
  storageBucket: "court-craft-journal.firebasestorage.app",
  messagingSenderId: "559028689866",
  appId: "1:559028689866:web:e91e29947befaa262f4d33",
  measurementId: "G-MZ85K4EJ6X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ADD OFFLINE SUPPORT
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('✅ Offline persistence enabled');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Browser doesn\'t support offline persistence');
    }
  });

// Export everything needed
export { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy 
};