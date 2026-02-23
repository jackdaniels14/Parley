import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/common/Layout'
import Feed from './pages/Feed'
import Create from './pages/Create'
import Arena from './pages/Arena'
import DebateView from './pages/DebateView'
import DebateResult from './pages/DebateResult'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import { Loading } from './components/common'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  return isAuthenticated ? <Navigate to="/" /> : <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

        {/* Feed home + Create — use full-bleed feed layout */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout variant="feed" />
            </PrivateRoute>
          }
        >
          <Route index element={<Feed />} />
          <Route path="create" element={<Create />} />
        </Route>

        {/* All other app pages — use default padded layout */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="arena" element={<Arena />} />
          <Route path="debate/:id" element={<DebateView />} />
          <Route path="debate/:id/results" element={<DebateResult />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="onboarding" element={<Onboarding />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
