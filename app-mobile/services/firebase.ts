import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDYvsm2w7YIvVxAyM7I63VnZW9how21RAE",
  authDomain: "aistyling-app.firebaseapp.com",
  projectId: "aistyling-app",
  storageBucket: "aistyling-app.appspot.com",
  messagingSenderId: "322708751510",
  appId: "1:322708751510:web:5bcb02f46367141badeeb7",
  measurementId: "G-FG6JSJ7F56",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
