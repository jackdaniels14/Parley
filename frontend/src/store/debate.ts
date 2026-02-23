import { create } from 'zustand'
import type { Side } from '../types'

interface DebateState {
  // Active debate tracking
  activeDebateId: string | null
  mySide: Side | null
  isMyTurn: boolean
  currentRound: number
  timeRemaining: number // seconds, decremented client-side
  timerInterval: ReturnType<typeof setInterval> | null

  // Actions
  setActiveDebate: (id: string | null) => void
  setMySide: (side: Side | null) => void
  setIsMyTurn: (value: boolean) => void
  setCurrentRound: (round: number) => void
  startTimer: (seconds: number) => void
  stopTimer: () => void
  reset: () => void
}

export const useDebateStore = create<DebateState>()((set, get) => ({
  activeDebateId: null,
  mySide: null,
  isMyTurn: false,
  currentRound: -1,
  timeRemaining: 0,
  timerInterval: null,

  setActiveDebate: (id) => set({ activeDebateId: id }),
  setMySide: (side) => set({ mySide: side }),
  setIsMyTurn: (value) => set({ isMyTurn: value }),
  setCurrentRound: (round) => set({ currentRound: round }),

  startTimer: (seconds) => {
    const existing = get().timerInterval
    if (existing) clearInterval(existing)

    const interval = setInterval(() => {
      const { timeRemaining } = get()
      if (timeRemaining <= 0) {
        clearInterval(interval)
        set({ timeRemaining: 0, timerInterval: null })
      } else {
        set({ timeRemaining: timeRemaining - 1 })
      }
    }, 1000)

    set({ timeRemaining: seconds, timerInterval: interval })
  },

  stopTimer: () => {
    const { timerInterval } = get()
    if (timerInterval) clearInterval(timerInterval)
    set({ timeRemaining: 0, timerInterval: null })
  },

  reset: () => {
    const { timerInterval } = get()
    if (timerInterval) clearInterval(timerInterval)
    set({
      activeDebateId: null,
      mySide: null,
      isMyTurn: false,
      currentRound: -1,
      timeRemaining: 0,
      timerInterval: null,
    })
  },
}))
