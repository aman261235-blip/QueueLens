
import { useState, useEffect, useRef } from 'react'

import Sidebar from './components/Sidebar'
import StatCard from './components/StatCard'
import QueueCard from './components/QueueCard'

import {
  getQueues,
  addLocation as saveLocation,
  updateQueue,
  deleteLocation,
} from './api/queueApi'

function App() {
  const [queues, setQueues] = useState([])
  const [showForm, setShowForm] = useState(false)

  const [locationName, setLocationName] = useState('')
  const [people, setPeople] = useState('')

  // Phase 6: Search and filter
  const [searchTerm, setSearchTerm] = useState('')
  const [crowdFilter, setCrowdFilter] = useState('All')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [liveConnected, setLiveConnected] = useState(false)

  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  )

  const [toast, setToast] = useState('')

  const socketsRef = useRef([])
  const queuesRef = useRef([])

  // Keep latest queues available to WebSocket callbacks
  useEffect(() => {
    queuesRef.current = queues
  }, [queues])

  // Automatically hide in-app notification
  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast('')
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast])

  // Enable desktop notifications
  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported')
      setToast('Your browser does not support desktop notifications.')
      return
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted')
      setToast('Desktop notifications are already enabled.')
      return
    }

    if (Notification.permission === 'denied') {
      setNotificationPermission('denied')
      setToast(
        'Notifications are blocked. Allow them in Chrome site settings.'
      )
      return
    }

    try {
      const permission = await Notification.requestPermission()

      setNotificationPermission(permission)

      if (permission === 'granted') {
        setToast('Desktop notifications enabled successfully!')

        new Notification('QueueLens', {
          body: 'You will now receive live queue notifications.',
        })
      } else {
        setToast('Desktop notification permission was not granted.')
      }
    } catch (err) {
      console.error('Notification permission error:', err)
      setToast('Could not enable desktop notifications.')
    }
  }

  // Calculate crowd level
  const getCrowdLevel = (count) => {
    if (count <= 10) return 'Low'
    if (count <= 20) return 'Medium'
    return 'High'
  }

  // Phase 6: Filter locations by search and crowd level
  const filteredQueues = queues.filter((queue) => {
    const matchesSearch = queue.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase().trim())

    const crowdLevel = queue.crowdLevel || getCrowdLevel(queue.people)

    const matchesCrowd =
      crowdFilter === 'All' || crowdLevel === crowdFilter

    return matchesSearch && matchesCrowd
  })

  // Dashboard statistics
  const totalPeople = queues.reduce(
    (total, queue) => total + queue.people,
    0
  )

  const averageWait = queues.length
    ? Math.round(
        queues.reduce(
          (total, queue) => total + queue.waitTime,
          0
        ) / queues.length
      )
    : 0

  // Load queue data
  const loadQueues = async () => {
    try {
      setError('')

      const data = await getQueues()

      setQueues(data)

      return data
    } catch (err) {
      setError('Could not load queue data. Check your backend server.')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Initial queue loading
  useEffect(() => {
    loadQueues()
  }, [])

  // Connect to real-time updates for each location
  useEffect(() => {
    if (queues.length === 0) {
      socketsRef.current.forEach((socket) => socket.close())
      socketsRef.current = []
      setLiveConnected(false)
      return
    }

    const token = localStorage.getItem('queuelens_token')

    if (!token) return

    let active = true
    let openConnections = 0

    const sockets = queues.map((queue) => {
      const protocol =
        window.location.protocol === 'https:' ? 'wss:' : 'ws:'

      const socket = new WebSocket(
        `${protocol}//127.0.0.1:8000/ws/queues/${queue.id}?token=${encodeURIComponent(token)}`
      )

      socket.onopen = () => {
        if (!active) return

        openConnections += 1
        setLiveConnected(true)
      }

      socket.onmessage = (event) => {
        if (!active) return

        try {
          const message = JSON.parse(event.data)

          if (message.type === 'queue_update') {
            const currentQueue = queuesRef.current.find(
              (item) => item.id === message.location_id
            )

            const currentLocationName =
              message.location_name ||
              currentQueue?.name ||
              'Queue location'

            const notificationMessage =
              `${currentLocationName}: ${message.people_waiting} people waiting.`

            // Update dashboard immediately
            setQueues((previousQueues) =>
              previousQueues.map((item) =>
                item.id === message.location_id
                  ? {
                      ...item,
                      people: message.people_waiting,
                      waitTime: Math.ceil(
                        message.people_waiting * 0.6
                      ),
                      crowdLevel: getCrowdLevel(
                        message.people_waiting
                      ),
                    }
                  : item
              )
            )

            // Show in-app notification
            setToast(notificationMessage)

            // Show Windows desktop notification
            if (
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification('QueueLens - Queue Updated', {
                body: notificationMessage,
                tag: `queuelens-${message.location_id}`,
              })
            }
          }
        } catch (err) {
          console.error('Invalid WebSocket message:', err)
        }
      }

      socket.onclose = () => {
        if (!active) return

        openConnections = Math.max(0, openConnections - 1)
        setLiveConnected(openConnections > 0)
      }

      socket.onerror = () => {
        console.error(
          `WebSocket connection failed for location ${queue.id}`
        )
      }

      return socket
    })

    socketsRef.current = sockets

    return () => {
      active = false

      sockets.forEach((socket) => {
        socket.close()
      })

      socketsRef.current = []
      setLiveConnected(false)
    }
  }, [queues.map((queue) => queue.id).join(',')])

  // Add new location
  const handleAddLocation = async (e) => {
    e.preventDefault()

    const count = Number(people)

    if (
      !locationName.trim() ||
      people === '' ||
      !Number.isInteger(count) ||
      count < 0
    ) {
      setError('Enter a valid location name and people count.')
      return
    }

    try {
      await saveLocation({
        name: locationName.trim(),
        description: 'Queue monitoring location',
        people_waiting: count,
      })

      setLocationName('')
      setPeople('')
      setShowForm(false)

      await loadQueues()
    } catch (err) {
      setError('Could not save location.')
    }
  }

  // Update queue
  const handleUpdateQueue = async (id, people) => {
    try {
      setError('')

      await updateQueue(id, people)

      // WebSocket updates the dashboard automatically.
      await loadQueues()
    } catch (err) {
      setError('Could not update queue. Please try again.')
    }
  }

  // Delete location
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) {
      return
    }

    try {
      await deleteLocation(id)
      await loadQueues()
    } catch (err) {
      setError('Could not delete location.')
    }
  }

  // Clear search and filters
  const clearFilters = () => {
    setSearchTerm('')
    setCrowdFilter('All')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">

      <Sidebar />

      <main className="flex-1 p-8">

        {/* In-app notification */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 max-w-sm bg-slate-800 border border-blue-500 rounded-xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔔</span>

              <div className="flex-1">
                <p className="text-white font-semibold">
                  QueueLens Notification
                </p>

                <p className="text-slate-300 text-sm mt-1">
                  {toast}
                </p>
              </div>

              <button
                onClick={() => setToast('')}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-10">

          <div>
            <h1 className="text-3xl font-bold text-white">
              Dashboard
            </h1>

            <p className="text-slate-400 mt-2">
              Welcome to QueueLens monitoring system.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">

            <span className="text-green-400 bg-slate-900 px-4 py-3 rounded-lg">
              ● API Connected
            </span>

            <span
              className={`px-4 py-3 rounded-lg ${
                liveConnected
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-yellow-400 bg-yellow-500/10'
              }`}
            >
              ● {liveConnected ? 'Live Connected' : 'Live Connecting'}
            </span>

            <button
              onClick={enableNotifications}
              disabled={notificationPermission === 'unsupported'}
              className={`px-4 py-3 rounded-lg text-white ${
                notificationPermission === 'granted'
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {notificationPermission === 'granted'
                ? '✓ Notifications Enabled'
                : notificationPermission === 'denied'
                  ? 'Notifications Blocked'
                  : notificationPermission === 'unsupported'
                    ? 'Notifications Unsupported'
                    : '🔔 Enable Notifications'}
            </button>

          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          <StatCard
            title="Total Locations"
            value={String(queues.length).padStart(2, '0')}
            subtitle="Active locations"
          />

          <StatCard
            title="People Waiting"
            value={totalPeople}
            subtitle="Across all locations"
          />

          <StatCard
            title="Average Wait Time"
            value={`${averageWait} min`}
            subtitle="Current estimated wait"
          />

        </div>

        {/* Queue Heading */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">

          <div>
            <h2 className="text-xl font-bold text-white">
              Live Queue Status
            </h2>

            <p className="text-slate-400 text-sm mt-2">
              Queue counts update automatically in real time.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg"
          >
            + Add Location
          </button>

        </div>

        {/* Error Message */}
        {error && (
          <p className="text-red-400 mb-4">
            {error}
          </p>
        )}

        {/* Add Location Form */}
        {showForm && (
          <form
            onSubmit={handleAddLocation}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6"
          >

            <h3 className="text-white text-lg font-semibold mb-4">
              Add New Location
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <input
                type="text"
                placeholder="Location name"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
                className="bg-slate-800 text-white p-3 rounded-lg"
              />

              <input
                type="number"
                min="0"
                step="1"
                placeholder="People waiting"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                required
                className="bg-slate-800 text-white p-3 rounded-lg"
              />

            </div>

            <div className="flex gap-3 mt-5">

              <button
                type="submit"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg"
              >
                Save Location
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-700 text-white px-5 py-2 rounded-lg"
              >
                Cancel
              </button>

            </div>

          </form>
        )}

        {/* Phase 6: Search and Filter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">

          <h3 className="text-white font-semibold mb-4">
            Search and Filter Locations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Search */}
            <input
              type="text"
              placeholder="🔍 Search location name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-blue-500"
            />

            {/* Crowd Filter */}
            <select
              value={crowdFilter}
              onChange={(e) => setCrowdFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-blue-500"
            >
              <option value="All">All Crowd Levels</option>
              <option value="Low">Low Crowd</option>
              <option value="Medium">Medium Crowd</option>
              <option value="High">High Crowd</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-lg"
            >
              Clear Filters
            </button>

          </div>

          <p className="text-slate-400 text-sm mt-4">
            Showing {filteredQueues.length} of {queues.length} locations
          </p>

        </div>

        {/* Queue Cards */}
        {loading ? (

          <p className="text-slate-400">
            Loading queue data...
          </p>

        ) : queues.length === 0 ? (

          <p className="text-slate-400">
            No locations yet. Add your first location!
          </p>

        ) : filteredQueues.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">

            <p className="text-white text-lg font-semibold">
              No matching locations found
            </p>

            <p className="text-slate-400 mt-2">
              Try another search term or crowd filter.
            </p>

            <button
              onClick={clearFilters}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
            >
              Clear Filters
            </button>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            {filteredQueues.map((queue) => (

              <div key={queue.id}>

                <QueueCard
                  name={queue.name}
                  people={queue.people}
                  waitTime={queue.waitTime}
                  crowdLevel={
                    queue.crowdLevel || getCrowdLevel(queue.people)
                  }
                  onUpdate={(newPeople) =>
                    handleUpdateQueue(queue.id, newPeople)
                  }
                />

                <button
                  onClick={() => handleDelete(queue.id)}
                  className="mt-3 text-red-400 text-sm hover:text-red-300"
                >
                  Delete Location
                </button>

              </div>

            ))}

          </div>

        )}

      </main>

    </div>
  )
}

export default App
