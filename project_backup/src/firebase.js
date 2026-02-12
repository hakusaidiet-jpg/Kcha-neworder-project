// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCMo6zJ8zJQJP2yF-lnTD3o5OI_PO_2sp4",
    authDomain: "kchacha-order.firebaseapp.com",
    projectId: "kchacha-order",
    storageBucket: "kchacha-order.firebasestorage.app",
    messagingSenderId: "176828998003",
    appId: "1:176828998003:web:27259816150b55106fa506",
    measurementId: "G-2N5G8QNEW8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);