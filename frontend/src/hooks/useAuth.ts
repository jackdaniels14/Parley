import { useAuthStore } from '../store/auth'

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useAuthStore()

  return {
    user,
    isLoading,
    isAuthenticated,
  }
}
