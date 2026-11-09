
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/apiClient.js'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient.post(
        '/auth/login',
        { email, password }
      )

      localStorage.setItem(
        'queuelens_token',
        response.data.access_token
      )

      localStorage.setItem(
        'queuelens_user',
        JSON.stringify(response.data.user)
      )

      // Redirect according to user role
      if (response.data.user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }

    } catch (err) {
      setError(
        err.userMessage ||
        err.response?.data?.detail ||
        'Login failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8">

        <h1 className="text-3xl font-bold text-white text-center">
          QueueLens
        </h1>

        <p className="text-slate-400 text-center mt-2">
          Welcome back! Sign in to continue.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">

          <div>
            <label className="text-slate-300 text-sm">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              className="w-full mt-2 bg-slate-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full mt-2 bg-slate-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <p className="text-slate-400 text-center mt-6 text-sm">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-blue-400 hover:text-blue-300"
          >
            Create Account
          </Link>
        </p>

      </div>
    </div>
  )
}

export default Login
