import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDeYffS0_gKd5gcyhMObLlDVMQi7D3s49E",
  authDomain: "beework-c9635.firebaseapp.com",
  projectId: "beework-c9635",
  storageBucket: "beework-c9635.firebasestorage.app",
  messagingSenderId: "250336719202",
  appId: "1:250336719202:web:8db849847c2cb4eb507c3b",
  measurementId: "G-RE057PCDWV"
};

const app = initializeApp(firebaseConfig);

// ✅ Export both
export const auth = getAuth(app);
export const db = getFirestore(app);
