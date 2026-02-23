import { create } from 'zustand'

interface MatchmakingState {
  queueEntryId: string | null
  status: 'idle' | 'waiting' | 'matched'
  matchedDebateId: string | null

  enqueue: (entryId: string) => void
  setMatched: (debateId: string) => void
  reset: () => void
}

export const useMatchmakingStore = create<MatchmakingState>()((set) => ({
  queueEntryId: null,
  status: 'idle',
  matchedDebateId: null,

  enqueue: (entryId) =>
    set({
      queueEntryId: entryId,
      status: 'waiting',
      matchedDebateId: null,
    }),

  setMatched: (debateId) =>
    set({
      status: 'matched',
      matchedDebateId: debateId,
    }),

  reset: () =>
    set({
      queueEntryId: null,
      status: 'idle',
      matchedDebateId: null,
    }),
}))
