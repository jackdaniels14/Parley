import { create } from 'zustand'
import type { ThemeMode } from '../types'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

const stored = (localStorage.getItem('parley-theme') as ThemeMode) || 'system'
applyTheme(stored)

export const useThemeStore = create<ThemeState>()((set) => ({
  mode: stored,
  setMode: (mode) => {
    localStorage.setItem('parley-theme', mode)
    applyTheme(mode)
    set({ mode })
  },
}))

// Listen for OS preference changes when mode is 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { mode } = useThemeStore.getState()
  if (mode === 'system') applyTheme('system')
})
