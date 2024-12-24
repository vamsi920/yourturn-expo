import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA0p-9WPdrPf7SuSYZbtR73ZWN8x1xpvhM",
  authDomain: "yourturn-2c9c3.firebaseapp.com",
  projectId: "yourturn-2c9c3",
  storageBucket: "yourturn-2c9c3.firebasestorage.app",
  messagingSenderId: "503968496709",
  appId: "1:503968496709:web:f596fccb973bb498cef72c"
};

// Initialize Firebase only if no apps are already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Firebase Authentication
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };