import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { getUser } from '../services/firestore'

export function useCurrentUser() {
  const { firebaseUser, isLoading: authLoading } = useAuthStore()
  const uid = firebaseUser?.uid

  const {
    data: user,
    isLoading: queryLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['currentUser', uid],
    queryFn: () => getUser(uid!),
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
  })

  return {
    user: user ?? null,
    isLoading: uid ? queryLoading : authLoading,
    isError,
    error,
    uid: uid ?? null,
    firebaseUser,
  }
}
