import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBPAcqnvD5jMf1WP1gFtRWr8-OtHsYV1x8",
  authDomain: "medicine-manager-cdaa9.firebaseapp.com",
  projectId: "medicine-manager-cdaa9",
  storageBucket: "medicine-manager-cdaa9.firebasestorage.app",
  messagingSenderId: "1098486794878",
  appId: "1:1098486794878:web:a5aee4ca70d5a6cab9662f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);