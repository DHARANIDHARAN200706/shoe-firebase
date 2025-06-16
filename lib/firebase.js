import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // ✅ Import auth

const firebaseConfig = {
  apiKey: "AIzaSyCzm7pTj67q_UAHFdY3siKS8QPmxvOL5AY",
  authDomain: "shoe-store-44d23.firebaseapp.com",
  projectId: "shoe-store-44d23",
  storageBucket: "shoe-store-44d23.firebasestorage.app",
  messagingSenderId: "663305950374",
  appId: "1:663305950374:web:5904cd91abc1f99b625067",
  measurementId: "G-CQ174Y02B0"
};
console.log('Firebase Config:', JSON.stringify(firebaseConfig, null, 2));

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app); // ✅ Initialize auth

export { db, auth }; // ✅ Export auth too
