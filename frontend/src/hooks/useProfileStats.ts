import { useMemo } from 'react'
import { getProfileStats } from '../services/firestore'
import type { User, ProfileStats } from '../types'

export function useProfileStats(user: User | null | undefined): ProfileStats | null {
  return useMemo(() => {
    if (!user) return null
    return getProfileStats(user)
  }, [user])
}
