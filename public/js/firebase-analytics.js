// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBzFZ-k1xoZmijZz2ZW_zdR7l2-89FiSxg",
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
const analytics = getAnalytics(app);