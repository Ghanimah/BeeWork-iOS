import { Capacitor } from '@capacitor/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDeYffS0_gKd5gcyhMObLlDVMQi7D3s49E",
  authDomain: "beework-c9635.firebaseapp.com",
  projectId: "beework-c9635",
  // Firebase storage buckets for web SDK use the appspot.com domain
  storageBucket: "beework-c9635.appspot.com",
  messagingSenderId: "250336719202",
  appId: "1:250336719202:web:8db849847c2cb4eb507c3b",
  measurementId: "G-RE057PCDWV"
};

// Avoid re-initializing during HMR
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const isNative = (() => {
  try {
    const platform = Capacitor.getPlatform();
    return platform === 'ios' || platform === 'android';
  } catch {
    return false;
  }
})();

// On Capacitor (capacitor://localhost), skip the default popup/redirect resolver
// to avoid loading Google's gapi iframe bundle, which is blocked by CORS in WKWebView.
let authInstance;
if (isNative) {
  try {
    authInstance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: undefined
    });
  } catch {
    authInstance = getAuth(app);
  }
} else {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
