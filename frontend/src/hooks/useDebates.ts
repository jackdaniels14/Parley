import { useQuery } from '@tanstack/react-query'
import { getDailyDebates } from '../services/functions'
import { getDebateWithPosts } from '../services/firestore'

export function useTodayDebates() {
  return useQuery({
    queryKey: ['debates', 'today'],
    queryFn: getDailyDebates,
  })
}

export function useDebate(id: string) {
  return useQuery({
    queryKey: ['debate', id],
    queryFn: () => getDebateWithPosts(id),
    enabled: !!id,
  })
}
