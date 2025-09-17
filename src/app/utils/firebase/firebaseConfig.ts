import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyAOAvhzKYOGpYXj20MlOev-Jv749GZgN0w",
  authDomain: "carrers-21341.firebaseapp.com",
  projectId: "carrers-21341",
  storageBucket: "carrers-21341.firebasestorage.app",
  messagingSenderId: "894403646631",
  appId: "1:894403646631:web:fcd22c69ebfe5e68a3f782",
  measurementId: "G-7DHBBKTJQP"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app)
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage, auth };