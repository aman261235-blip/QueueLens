
import { useEffect, useState } from 'react'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

import {
  getQueues,
  getQueueHistory,
  downloadPDF,
  downloadExcel,
} from '../api/queueApi'

// Format date for HTML date inputs using local time
const formatDateInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function Analytics() {
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [history, setHistory] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState('')

  // Phase 6.2: Date filters
  const [datePreset, setDatePreset] = useState('7days')

  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 6)
    return formatDateInput(date)
  })

  const [customEndDate, setCustomEndDate] = useState(() =>
    formatDateInput(new Date())
  )

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const data = await getQueues()

        setLocations(data)

        if (data.length > 0) {
          setSelectedLocation(String(data[0].id))
        }
      } catch (err) {
        setError('Unable to load analytics data.')
      } finally {
        setLoading(false)
      }
    }

    loadLocations()
  }, [])

  // Load selected location history
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
        setError('Unable to load queue history.')
        setHistory([])
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [selectedLocation])

  // Download PDF or Excel report
  const handleDownload = async (format) => {
    if (!selectedLocation || downloading) return

    try {
      setDownloading(format)
      setError('')

      const blob =
        format === 'pdf'
          ? await downloadPDF(selectedLocation)
          : await downloadExcel(selectedLocation)

      const fileExtension = format === 'pdf' ? 'pdf' : 'xlsx'

      const fileName =
        `queuelens_location_${selectedLocation}.${fileExtension}`

      const fileBlob = new Blob([blob], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const url = window.URL.createObjectURL(fileBlob)

      const link = document.createElement('a')
      link.href = url
      link.download = fileName

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          `Unable to download ${format.toUpperCase()} report.`
      )
    } finally {
      setDownloading('')
    }
  }

  // Selected location
  const selectedQueue = locations.find(
    (location) => String(location.id) === selectedLocation
  )

  // Calculate selected date range
  const getSelectedDateRange = () => {
    const today = new Date()
    const endDate = new Date(today)
    endDate.setHours(23, 59, 59, 999)

    const startDate = new Date(today)
    startDate.setHours(0, 0, 0, 0)

    if (datePreset === '7days') {
      startDate.setDate(startDate.getDate() - 6)
    } else if (datePreset === '30days') {
      startDate.setDate(startDate.getDate() - 29)
    } else if (datePreset === 'custom') {
      if (!customStartDate || !customEndDate) {
        return { start: null, end: null, valid: false }
      }

      const customStart = new Date(`${customStartDate}T00:00:00`)
      const customEnd = new Date(`${customEndDate}T23:59:59.999`)

      if (
        Number.isNaN(customStart.getTime()) ||
        Number.isNaN(customEnd.getTime()) ||
        customStart > customEnd
      ) {
        return { start: null, end: null, valid: false }
      }

      return {
        start: customStart,
        end: customEnd,
        valid: true,
      }
    }

    return {
      start: startDate,
      end: endDate,
      valid: true,
    }
  }

  const selectedDateRange = getSelectedDateRange()

  // Filter history using selected date range
  const filteredHistory = selectedDateRange.valid
    ? history.filter((record) => {
        if (!record.created_at) return false

        const recordDate = new Date(record.created_at)

        if (Number.isNaN(recordDate.getTime())) return false

        return (
          recordDate >= selectedDateRange.start &&
          recordDate <= selectedDateRange.end
        )
      })
    : []

  // Sort history from oldest to newest
  const sortedHistory = [...filteredHistory].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  )

  // Queue activity chart
  const chartData = sortedHistory.map((record) => {
    const recordDate = new Date(record.created_at)

    return {
      time: recordDate.toLocaleDateString([], {
        day: '2-digit',
        month: 'short',
      }) + ' ' + recordDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      people: record.people_waiting,
    }
  })

  // Location comparison chart
  const locationData = locations.map((location) => ({
    name: location.name,
    people: location.people,
  }))

  // Average historical queue
  const averagePeople = filteredHistory.length
    ? Math.round(
        filteredHistory.reduce(
          (total, record) => total + record.people_waiting,
          0
        ) / filteredHistory.length
      )
    : 0

  // Average estimated waiting time
  const averageWait = filteredHistory.length
    ? Math.round(
        filteredHistory.reduce(
          (total, record) =>
            total + Math.ceil(record.people_waiting * 0.6),
          0
        ) / filteredHistory.length
      )
    : 0

  // Peak queue size during selected period
  const peakPeople = filteredHistory.length
    ? Math.max(
        ...filteredHistory.map((record) => record.people_waiting)
      )
    : 0

  // Crowd distribution
  const getCrowdLevel = (count) => {
    if (count <= 10) return 'Low'
    if (count <= 20) return 'Medium'
    return 'High'
  }

  const crowdData = [
    {
      name: 'Low',
      value: locations.filter(
        (item) => getCrowdLevel(item.people) === 'Low'
      ).length,
    },
    {
      name: 'Medium',
      value: locations.filter(
        (item) => getCrowdLevel(item.people) === 'Medium'
      ).length,
    },
    {
      name: 'High',
      value: locations.filter(
        (item) => getCrowdLevel(item.people) === 'High'
      ).length,
    },
  ].filter((item) => item.value > 0)

  const COLORS = ['#22c55e', '#eab308', '#ef4444']

  if (loading && locations.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        Loading analytics...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">

      <div className="max-w-7xl mx-auto">

        {/* Page Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Queue Analytics
          </h1>

          <p className="text-slate-400 mt-2">
            Understand queue activity and crowd patterns.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-5">
            {error}
          </div>
        )}

        {/* Location Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">

          <label className="block text-sm text-slate-400 mb-3">
            Select location for queue activity
          </label>

          <select
            value={selectedLocation}
            onChange={(event) =>
              setSelectedLocation(event.target.value)
            }
            className="w-full md:w-80 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>

        </div>

        {/* Phase 6.2: Date Range Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">

          <h2 className="text-lg font-semibold mb-4">
            Analytics Date Range
          </h2>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-3 mb-5">

            <button
              onClick={() => setDatePreset('today')}
              className={`px-5 py-2 rounded-lg ${
                datePreset === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Today
            </button>

            <button
              onClick={() => setDatePreset('7days')}
              className={`px-5 py-2 rounded-lg ${
                datePreset === '7days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Last 7 Days
            </button>

            <button
              onClick={() => setDatePreset('30days')}
              className={`px-5 py-2 rounded-lg ${
                datePreset === '30days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Last 30 Days
            </button>

            <button
              onClick={() => setDatePreset('custom')}
              className={`px-5 py-2 rounded-lg ${
                datePreset === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Custom Range
            </button>

          </div>

          {/* Custom Date Inputs */}
          {datePreset === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Start Date
                </label>

                <input
                  type="date"
                  value={customStartDate}
                  max={customEndDate || undefined}
                  onChange={(event) =>
                    setCustomStartDate(event.target.value)
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  End Date
                </label>

                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  onChange={(event) =>
                    setCustomEndDate(event.target.value)
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                />
              </div>

            </div>
          )}

          {!selectedDateRange.valid && (
            <p className="text-red-400 text-sm mt-4">
              Please select a valid date range. Start date must not be after end date.
            </p>
          )}

          <p className="text-slate-400 text-sm mt-4">
            {selectedDateRange.valid
              ? `Showing ${filteredHistory.length} queue records for the selected period.`
              : 'No records can be displayed until you select a valid date range.'}
          </p>

        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">

          <button
            onClick={() => handleDownload('pdf')}
            disabled={!selectedLocation || downloading !== ''}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg font-medium transition-colors"
          >
            {downloading === 'pdf'
              ? 'Generating PDF...'
              : '↓ Download PDF Report'}
          </button>

          <button
            onClick={() => handleDownload('excel')}
            disabled={!selectedLocation || downloading !== ''}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg font-medium transition-colors"
          >
            {downloading === 'excel'
              ? 'Generating Excel...'
              : '↓ Download Excel Report'}
          </button>

        </div>

        <p className="text-xs text-slate-500 mb-6">
          PDF and Excel downloads use your existing backend export endpoints.
          The date filters currently apply to the dashboard analytics.
        </p>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-400 text-sm">
              Current People Waiting
            </p>

            <h2 className="text-3xl font-bold text-blue-400 mt-3">
              {selectedQueue?.people ?? 0}
            </h2>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-400 text-sm">
              Average Historical Queue
            </p>

            <h2 className="text-3xl font-bold text-purple-400 mt-3">
              {averagePeople}
            </h2>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-400 text-sm">
              Average Estimated Wait
            </p>

            <h2 className="text-3xl font-bold text-green-400 mt-3">
              {averageWait} min
            </h2>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-400 text-sm">
              Peak People Waiting
            </p>

            <h2 className="text-3xl font-bold text-red-400 mt-3">
              {peakPeople}
            </h2>
          </div>

        </div>

        {/* Charts */}
        {loading ? (
          <p className="text-slate-400">
            Loading charts...
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Queue Activity */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

              <h2 className="text-lg font-semibold mb-6">
                Queue Activity
              </h2>

              {chartData.length === 0 ? (
                <p className="text-slate-400">
                  No history available for this date range.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                    />

                    <XAxis
                      dataKey="time"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis stroke="#94a3b8" />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="people"
                      name="People Waiting"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                    />

                  </LineChart>
                </ResponsiveContainer>
              )}

            </div>

            {/* Location Comparison */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

              <h2 className="text-lg font-semibold mb-6">
                Location Comparison
              </h2>

              {locationData.length === 0 ? (
                <p className="text-slate-400">
                  No locations available.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={locationData}>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                    />

                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                    />

                    <YAxis stroke="#94a3b8" />

                    <Tooltip />

                    <Bar
                      dataKey="people"
                      name="People Waiting"
                      fill="#8b5cf6"
                      radius={[6, 6, 0, 0]}
                    />

                  </BarChart>
                </ResponsiveContainer>
              )}

            </div>

            {/* Crowd Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:col-span-2">

              <h2 className="text-lg font-semibold mb-6">
                Crowd Level Distribution
              </h2>

              {crowdData.length === 0 ? (
                <p className="text-slate-400">
                  No crowd data available.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>

                    <Pie
                      data={crowdData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {crowdData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[index]}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                    <Legend />

                  </PieChart>
                </ResponsiveContainer>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default Analytics
