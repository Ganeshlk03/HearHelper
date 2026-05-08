// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: Replace the following with your app's Firebase project configuration
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or open an existing one
// 3. Click the gear icon (Project Settings)
// 4. Scroll down to "Your apps" and add a Web app (</>)
// 5. Copy the firebaseConfig object below
const firebaseConfig = {
  apiKey: "AIzaSyB_FJWhMaWPZTBkV2PR-JweQgDszJ1ZEJw",
  authDomain: "hearhelper-28c39.firebaseapp.com",
  databaseURL: "https://hearhelper-28c39-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hearhelper-28c39",
  storageBucket: "hearhelper-28c39.firebasestorage.app",
  messagingSenderId: "305003024986",
  appId: "1:305003024986:web:f0c95559756499b3d23e63",
  measurementId: "G-WN98RNLBDH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { auth, db };
