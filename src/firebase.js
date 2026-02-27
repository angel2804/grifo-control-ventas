import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA8hNzbt05xBjOakY6jtARF8emhpGa2hao",
  authDomain: "grifo-76de7.firebaseapp.com",
  projectId: "grifo-76de7",
  storageBucket: "grifo-76de7.firebasestorage.app",
  messagingSenderId: "1068460660896",
  appId: "1:1068460660896:web:86ed499645cea45a5791c5",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
