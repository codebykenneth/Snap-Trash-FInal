// ============================================================
// SNAP TRASH — Firebase configuration
// ------------------------------------------------------------
// Replace the values below with YOUR OWN Firebase project's config.
// Get them from: Firebase Console → ⚙️ Project settings → General
//   → scroll to "Your apps" → the web app (</>) → SDK setup and configuration
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-kRASuNh6-KYXnfSomeit1ySZuTsve-M",
  authDomain: "snap-trash-829dd.firebaseapp.com",
  projectId: "snap-trash-829dd",
  storageBucket: "snap-trash-829dd.firebasestorage.app",
  messagingSenderId: "326066764130",
  appId: "1:326066764130:web:ad9504afa5b54fd011943b",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
