import { useQuery } from '@tanstack/react-query'
import { getProfileStats } from '../services/firestore'
import type { ProfileStats } from '../types'

export function useProfileStats(uid: string | undefined) {
  return useQuery<ProfileStats>({
    queryKey: ['profileStats', uid],
    queryFn: () => getProfileStats(uid!),
    enabled: !!uid,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
