import { create } from 'zustand'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { getUser } from '../services/firestore'
import type { User } from '../types'

interface AuthState {
  firebaseUser: FirebaseUser | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setFirebaseUser: (firebaseUser: FirebaseUser | null) => void
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  firebaseUser: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setFirebaseUser: (firebaseUser) =>
    set({
      firebaseUser,
      isAuthenticated: !!firebaseUser,
    }),
  setUser: (user) => set({ user, isLoading: false }),
  logout: () =>
    set({
      firebaseUser: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}))

// Initialize Firebase Auth listener
onAuthStateChanged(auth, async (firebaseUser) => {
  const store = useAuthStore.getState()
  store.setFirebaseUser(firebaseUser)

  if (firebaseUser) {
    try {
      const userDoc = await getUser(firebaseUser.uid)
      store.setUser(userDoc)
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
      store.setUser(null)
    }
  } else {
    store.setUser(null)
  }
})
