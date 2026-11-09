
import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import apiClient from '../api/apiClient'

function AdminActivityLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activityId, setActivityId] = useState('')
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')

  const loadLogs = async (filters = {}) => {
    try {
      setLoading(true)
      setError('')

      const params = { limit: 100 }

      if (filters.activityId?.trim()) {
        params.activity_id = filters.activityId.trim()
      }

      if (filters.userId?.trim()) {
        params.user_id = filters.userId.trim()
      }

      if (filters.action) {
        params.action = filters.action
      }

      const response = await apiClient.get(
        '/admin/activity-logs',
        { params }
      )

      setLogs(response.data)
    } catch (err) {
      setError(
        err.userMessage ||
        err.response?.data?.detail ||
        'Unable to load activity logs. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString()
  }

  const getActionStyle = (action) => {
    const styles = {
      LOGIN: 'bg-green-500/20 text-green-300',
      LOCATION_CREATE: 'bg-blue-500/20 text-blue-300',
      QUEUE_UPDATE: 'bg-yellow-500/20 text-yellow-300',
      LOCATION_DELETE: 'bg-red-500/20 text-red-300',
      LOGOUT: 'bg-purple-500/20 text-purple-300',
    }

    return styles[action] || 'bg-slate-700 text-slate-300'
  }

  const handleFilter = () => {
    loadLogs({ activityId, userId, action })
  }

  const clearFilters = () => {
    setActivityId('')
    setUserId('')
    setAction('')
    loadLogs()
  }

  const refreshLogs = () => {
    loadLogs({ activityId, userId, action })
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />

      <main className="flex-1 min-w-0 p-5 md:p-8">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-wider">
              Administration
            </p>

            <h1 className="text-3xl font-bold text-white mt-1">
              Activity Logs
            </h1>

            <p className="text-slate-400 mt-2">
              Monitor important activities performed by QueueLens users.
            </p>
          </div>

          <button
            onClick={refreshLogs}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg"
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-7">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-sm">
              Total Activities
            </p>
            <h2 className="text-3xl font-bold text-white mt-2">
              {logs.length}
            </h2>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-sm">
              Unique Users
            </p>
            <h2 className="text-3xl font-bold text-blue-400 mt-2">
              {new Set(logs.map(log => log.user_id).filter(Boolean)).size}
            </h2>
          </div>

        </div>

        {/* Filters */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-7">

          <h2 className="text-lg font-semibold text-white mb-5">
            Filter Activities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

            {/* Activity ID */}
            <input
              type="number"
              min="1"
              placeholder="Enter Activity ID"
              value={activityId}
              onChange={e => setActivityId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500"
            />

            {/* User ID */}
            <input
              type="number"
              min="1"
              placeholder="Enter User ID"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500"
            />

            {/* Activity Type */}
            <select
              value={action}
              onChange={e => setAction(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="">All Activities</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="LOCATION_CREATE">Location Created</option>
              <option value="QUEUE_UPDATE">Queue Updated</option>
              <option value="LOCATION_DELETE">Location Deleted</option>
            </select>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleFilter}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 disabled:opacity-50"
              >
                Apply
              </button>

              <button
                onClick={clearFilters}
                disabled={loading}
                className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-3 disabled:opacity-50"
              >
                Clear
              </button>
            </div>

          </div>

          <p className="text-xs text-slate-500 mt-3">
            You can combine Activity ID, User ID and Activity Type filters.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 mb-5">
            {error}

            <button
              onClick={refreshLogs}
              className="ml-3 underline font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Activity Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">

          <h2 className="text-xl font-bold text-white mb-5">
            Recent Activities
          </h2>

          {loading ? (
            <p className="text-slate-400 py-8 text-center">
              Loading activity records...
            </p>
          ) : logs.length === 0 ? (
            <p className="text-slate-400 py-10 text-center">
              No activity records found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">

                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="py-4 pr-4">ID</th>
                    <th className="py-4 pr-4">User</th>
                    <th className="py-4 pr-4">Action</th>
                    <th className="py-4 pr-4">Description</th>
                    <th className="py-4">Date & Time</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map(log => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-800 text-slate-300 hover:bg-slate-800/40"
                    >
                      <td className="py-4 pr-4">
                        {log.id}
                      </td>

                      <td className="py-4 pr-4">
                        <p className="text-white font-medium">
                          {log.user_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {log.user_email || `User ID: ${log.user_id ?? 'N/A'}`}
                        </p>
                      </td>

                      <td className="py-4 pr-4">
                        <span className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${getActionStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-4 pr-4 max-w-xs">
                        {log.description}
                      </td>

                      <td className="py-4 text-sm whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}

        </section>

      </main>
    </div>
  )
}

export default AdminActivityLogs
