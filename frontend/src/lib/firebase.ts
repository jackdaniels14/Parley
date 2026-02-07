import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBurAM8HQJiwI8fnaKkLgRnF0nj1Lg27Bw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'parley-a9d23.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'parley-a9d23',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'parley-a9d23.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '786121825375',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:786121825375:web:7cedfdfc7cea7b569d4fea',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-6LL8NJ7M6F',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)

// Connect to emulators in development (set VITE_USE_EMULATORS=true to enable)
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  } catch (err) {
    // Emulators may already be connected on HMR reload
    console.debug('Emulator connection skipped:', err)
  }
}

export default app
