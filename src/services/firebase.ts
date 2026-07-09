import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nexoprop-mock.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nexoprop-mock",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nexoprop-mock.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializamos Firestore con soporte para caché persistente en IndexedDB.
// Esto permite que el simulador local/offline guarde los documentos de inmediato en el navegador.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const storage = getStorage(app);
export const auth = getAuth(app);

// Si es un entorno simulado de desarrollo sin base de datos real en la nube,
// deshabilitamos la red para evitar timeouts y permitir pruebas 100% locales instantáneas.
if (firebaseConfig.projectId === 'nexoprop-mock') {
  disableNetwork(db)
    .then(() => console.log('Firestore corriendo en modo offline local (mock).'))
    .catch((err) => console.warn('No se pudo deshabilitar la red de Firestore:', err));
}

export default app;
