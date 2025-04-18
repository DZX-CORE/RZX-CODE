/**
 * Inicialização do Firebase para o cliente
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Verificar se temos as chaves necessárias do Firebase
const keysAvailable = {
  apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY ? "✓" : "✗",
  projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID ? "✓" : "✗",
  appId: !!import.meta.env.VITE_FIREBASE_APP_ID ? "✓" : "✗",
  databaseURL: !!import.meta.env.VITE_FIREBASE_DATABASE_URL ? "✓" : "✗",
};

console.log("Firebase keys available:", keysAvailable);

// Inicializar Firebase em modo offline se as chaves não estiverem disponíveis
const hasRequiredKeys = 
  !!import.meta.env.VITE_FIREBASE_API_KEY &&
  !!import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  !!import.meta.env.VITE_FIREBASE_APP_ID;

// Inicializar o Firebase apenas se as chaves estiverem disponíveis
let app, auth, database;

if (hasRequiredKeys) {
  try {
    // Inicializar Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Inicializar Realtime Database se a URL estiver disponível
    if (import.meta.env.VITE_FIREBASE_DATABASE_URL) {
      database = getDatabase(app);
      console.log("Firebase initialized in regular mode with database");
    } else {
      console.log("Firebase initialized in regular mode without database");
    }
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
} else {
  console.log("Firebase initialized in offline mode");
}

export { app, auth, database };
