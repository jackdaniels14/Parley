import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { registerUsername } from '../services/functions'
import { checkUsernameAvailable } from '../services/firestore'
import { Button, Input, Card } from '../components/common'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (username.length < 3 || username.length > 50) {
      setError('Username must be 3-50 characters')
      return
    }

    setLoading(true)

    try {
      console.log('[Register] Step 1: Checking username availability...')
      const available = await checkUsernameAvailable(username)
      if (!available) {
        setError('Username already taken')
        setLoading(false)
        return
      }
      console.log('[Register] Username available')

      console.log('[Register] Step 2: Creating Firebase Auth account...')
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      console.log('[Register] Auth account created:', userCredential.user.uid)

      try {
        console.log('[Register] Step 3: Calling registerUsername Cloud Function...')
        await registerUsername(username, displayName || undefined)
        console.log('[Register] Username registered successfully')
      } catch (fnErr) {
        console.error('[Register] Cloud Function failed:', fnErr)
        await userCredential.user.delete()
        throw fnErr
      }

      sendEmailVerification(userCredential.user).catch(() => {})
      navigate('/onboarding')
    } catch (err: unknown) {
      console.error('[Register] Registration error:', err)
      const errorMsg =
        err instanceof Error ? err.message : 'Registration failed'
      if (errorMsg.includes('email-already-in-use')) {
        setError('Email already registered. Try signing in instead.')
      } else if (errorMsg.includes('permission-denied')) {
        setError('Permission denied. Please try again.')
      } else if (errorMsg.includes('network')) {
        setError('Network error. Please check your connection.')
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-primary-600 mb-2">Parley</h1>
          <p className="text-gray-600 dark:text-gray-400">Join the conversation</p>
        </div>

        <Card padding="lg" className="shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Create account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Input
              id="username"
              type="text"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              minLength={3}
              maxLength={50}
              required
            />

            <Input
              id="displayName"
              type="text"
              label="Display Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
            />

            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />

            <Input
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
            />

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{error}</div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
            >
              Create account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
