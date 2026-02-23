import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCGoDQKjYsqRPh2VbbCX_wHxz67D7EC8K0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'parlay-8eba6.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'parlay-8eba6',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'parlay-8eba6.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '58775540753',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:58775540753:web:73acb7be01e6b2754f0db0',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-0KWK63RPQ0',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)
export const storage = getStorage(app)

// Connect to emulators in development (set VITE_USE_EMULATORS=true to enable)
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectFunctionsEmulator(functions, '127.0.0.1', 5001)
    connectStorageEmulator(storage, '127.0.0.1', 9199)
  } catch (err) {
    // Emulators may already be connected on HMR reload
    console.debug('Emulator connection skipped:', err)
  }
}

export default app
