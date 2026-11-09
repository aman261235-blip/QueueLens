
import { useEffect, useState } from 'react'
import { getQueues, getQueueHistory } from '../api/queueApi'

function QueueHistory() {
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load user's locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setError('')

        const data = await getQueues()
        setLocations(data)

        if (data.length > 0) {
          setSelectedLocation(String(data[0].id))
        }
      } catch (err) {
        setError(
          err.userMessage ||
          err.response?.data?.detail ||
          'Unable to load locations. Please try again.'
        )
      }
    }

    loadLocations()
  }, [])

  // Load history for selected location
  useEffect(() => {
    if (!selectedLocation) {
      setHistory([])
      return
    }

    const loadHistory = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await getQueueHistory(selectedLocation)
        setHistory(data.history || [])
      } catch (err) {
        setError(
          err.userMessage ||
          err.response?.data?.detail ||
          'Unable to load queue history. Please try again.'
        )
        setHistory([])
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [selectedLocation])

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-bold mb-2">
          Queue History
        </h1>

        <p className="text-slate-400 mb-8">
          Track previous queue updates for your locations.
        </p>

        {/* Location Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <label className="block text-sm text-slate-400 mb-3">
            Select Location
          </label>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            disabled={locations.length === 0}
            className="w-full md:w-80 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white disabled:opacity-50"
          >
            {locations.length === 0 ? (
              <option value="">No locations available</option>
            ) : (
              locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-4"
          >
            {error}
          </div>
        )}

        {/* History Content */}
        {loading ? (
          <p className="text-slate-400">
            Loading history...
          </p>
        ) : locations.length === 0 && !error ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400">
              No locations available. Add a location from your Dashboard first.
            </p>
          </div>
        ) : history.length === 0 && selectedLocation ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400">
              No queue history available for this location.
            </p>
          </div>
        ) : history.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-semibold">
                Previous Queue Updates
              </h2>

              <p className="text-slate-400 text-sm mt-1">
                {history.length} records found
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800 text-slate-400 text-sm">
                  <tr>
                    <th className="p-4">Record ID</th>
                    <th className="p-4">People Waiting</th>
                    <th className="p-4">Date & Time</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-t border-slate-800 hover:bg-slate-800/50"
                    >
                      <td className="p-4">
                        #{record.id}
                      </td>

                      <td className="p-4 font-semibold text-blue-400">
                        {record.people_waiting}
                      </td>

                      <td className="p-4 text-slate-400">
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  )
}

export default QueueHistory
