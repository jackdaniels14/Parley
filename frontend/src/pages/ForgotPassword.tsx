import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { Button, Input, Card } from '../components/common'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : ''
      if (errorMsg.includes('user-not-found')) {
        setError('No account found with that email')
      } else if (errorMsg.includes('invalid-email')) {
        setError('Please enter a valid email address')
      } else if (errorMsg.includes('too-many-requests')) {
        setError('Too many requests. Please try again later')
      } else {
        setError('Failed to send reset email. Please try again')
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
          <p className="text-gray-600 dark:text-gray-400">Reset your password</p>
        </div>

        <Card padding="lg" className="shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Forgot password?</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {success ? (
            <div className="space-y-4">
              <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                Check your inbox! We've sent a password reset link to <strong>{email}</strong>.
              </div>
              <Link
                to="/login"
                className="block text-center text-primary-600 hover:underline font-medium"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
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

              {error && (
                <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full"
                loading={loading}
              >
                Send reset link
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-primary-600 hover:underline font-medium"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
