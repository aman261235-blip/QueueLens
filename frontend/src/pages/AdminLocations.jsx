
import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import apiClient from '../api/apiClient'

function AdminLocations() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadLocations = async () => {
      try {
        setError('')

        const response = await apiClient.get('/admin/locations')
        setLocations(response.data)

      } catch (err) {
        setError(
          err.userMessage ||
          err.response?.data?.detail ||
          'Unable to load locations. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadLocations()
  }, [])

  const crowdStyle = (level) => {
    if (level === 'High') return 'bg-red-500/20 text-red-300'
    if (level === 'Medium') return 'bg-yellow-500/20 text-yellow-300'
    return 'bg-green-500/20 text-green-300'
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />

      <main className="flex-1 p-8 overflow-x-hidden">

        <h1 className="text-3xl font-bold text-white">
          All Locations
        </h1>

        <p className="text-slate-400 mt-2 mb-8">
          Monitor locations registered by all QueueLens users.
        </p>

        {error && (
          <div
            role="alert"
            className="bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg p-4 mb-5"
          >
            {error}
          </div>
        )}

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          {loading ? (
            <p className="text-slate-300">
              Loading locations...
            </p>
          ) : locations.length === 0 ? (
            <p className="text-slate-400">
              No locations registered yet.
            </p>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="py-3 pr-4">Location</th>
                    <th className="py-3 pr-4">Owner</th>
                    <th className="py-3 pr-4">People Waiting</th>
                    <th className="py-3 pr-4">Wait Time</th>
                    <th className="py-3">Crowd Level</th>
                  </tr>
                </thead>

                <tbody>
                  {locations.map(location => (
                    <tr
                      key={location.id}
                      className="border-b border-slate-800 text-slate-300"
                    >
                      <td className="py-4 pr-4">
                        <p className="text-white font-medium">
                          {location.name}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {location.description || 'No description'}
                        </p>
                      </td>

                      <td className="py-4 pr-4">
                        <p>{location.owner_name}</p>

                        <p className="text-xs text-slate-500 mt-1">
                          {location.owner_email}
                        </p>
                      </td>

                      <td className="py-4 pr-4">
                        {location.people}
                      </td>

                      <td className="py-4 pr-4">
                        {location.waitTime} min
                      </td>

                      <td className="py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${crowdStyle(location.crowdLevel)}`}
                        >
                          {location.crowdLevel}
                        </span>
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

export default AdminLocations
