import { useQuery } from '@tanstack/react-query'
import { getUser } from '../services/firestore'

export function useBlockedUsernames(blockedUids: string[]) {
  const sortedKey = [...blockedUids].sort().join(',')

  return useQuery({
    queryKey: ['blockedUsernames', sortedKey],
    queryFn: async () => {
      const map = new Map<string, string>()
      const results = await Promise.all(
        blockedUids.map((uid) => getUser(uid).then((u) => [uid, u?.username ?? uid] as const))
      )
      for (const [uid, username] of results) {
        map.set(uid, username)
      }
      return map
    },
    enabled: blockedUids.length > 0,
    staleTime: 1000 * 60 * 10,
  })
}
