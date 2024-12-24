import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyA0p-9WPdrPf7SuSYZbtR73ZWN8x1xpvhM",
    authDomain: "yourturn-2c9c3.firebaseapp.com",
    projectId: "yourturn-2c9c3",
    storageBucket: "yourturn-2c9c3.firebasestorage.app",
    messagingSenderId: "503968496709",
    appId: "1:503968496709:web:f596fccb973bb498cef72c"
  };

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { auth };