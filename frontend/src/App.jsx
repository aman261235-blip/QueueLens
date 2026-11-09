import AdminActivityLogs from './pages/AdminActivityLogs.jsx'
import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './Dashboard.jsx'
import QueueHistory from './pages/QueueHistory.jsx'
import Analytics from './pages/Analytics.jsx'

import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminAnalytics from './pages/AdminAnalytics.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import AdminLocations from './pages/AdminLocations.jsx'

import apiClient from './api/apiClient.js'


function ProtectedRoute({ children, requiredRole }) {
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let active = true

    const verifyToken = async () => {
      const token = localStorage.getItem('queuelens_token')

      if (!token) {
        if (active) setChecking(false)
        return
      }

      try {
        const response = await apiClient.get('/auth/me')

        if (active) {
          localStorage.setItem(
            'queuelens_user',
            JSON.stringify(response.data)
          )
          setUser(response.data)
        }
      } catch (error) {
        localStorage.removeItem('queuelens_token')
        localStorage.removeItem('queuelens_user')

        if (active) setUser(null)
      } finally {
        if (active) setChecking(false)
      }
    }

    verifyToken()

    return () => {
      active = false
    }
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white">Verifying your session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/dashboard'}
        replace
      />
    )
  }

  return children
}


function PublicRoute({ children }) {
  const token = localStorage.getItem('queuelens_token')
  const user = JSON.parse(
    localStorage.getItem('queuelens_user') || 'null'
  )

  if (token) {
    return (
      <Navigate
        to={user?.role === 'admin' ? '/admin' : '/dashboard'}
        replace
      />
    )
  }

  return children
}


function DashboardRedirect() {
  const user = JSON.parse(
    localStorage.getItem('queuelens_user') || 'null'
  )

  return (
    <Navigate
      to={user?.role === 'admin' ? '/admin' : '/dashboard'}
      replace
    />
  )
}


function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Normal User Routes */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="user">
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute requiredRole="user">
            <QueueHistory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute requiredRole="user">
            <Analytics />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

<Route
  path="/admin/activity-logs"
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminActivityLogs />
    </ProtectedRoute>
  }
/>

      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/locations"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLocations />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}


function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
