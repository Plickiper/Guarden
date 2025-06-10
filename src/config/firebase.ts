import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Auth Firebase Config
const authConfig = {
  apiKey: "AIzaSyCiVeHF53TPko9yLGGXdZKtEHjQu4zFjK8",
  authDomain: "login-b6065.firebaseapp.com",
  projectId: "login-b6065",
  storageBucket: "login-b6065.firebasestorage.app",
  messagingSenderId: "350186129845",
  appId: "1:350186129845:web:8af43c1cc09929d1b431fc"
};

// Database Firebase Config
const databaseConfig = {
  apiKey: "AIzaSyBdd8vFFiGb1itqR8IeZ5sTDNAmCI9XI0A",
  authDomain: "guarden-forms.firebaseapp.com",
  databaseURL: "https://guarden-forms-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "guarden-forms",
  storageBucket: "guarden-forms.firebasestorage.app",
  messagingSenderId: "998860852941",
  appId: "1:998860852941:web:45153848ef9a2ce09da384"
};

// Initialize Firebase apps
const authApp = initializeApp(authConfig, 'auth');
const databaseApp = initializeApp(databaseConfig, 'database');

// Get Auth and Database instances
export const auth = getAuth(authApp);
export const database = getDatabase(databaseApp);

export default { authApp, databaseApp }; 