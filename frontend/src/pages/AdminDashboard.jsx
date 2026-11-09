
import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import apiClient from '../api/apiClient'

function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setError('')

        const [usersResponse, locationsResponse] = await Promise.all([
          apiClient.get('/admin/users'),
          apiClient.get('/admin/locations')
        ])

        setUsers(usersResponse.data)
        setLocations(locationsResponse.data)

      } catch (err) {
        setError(
          err.userMessage ||
          err.response?.data?.detail ||
          'Unable to load admin data. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const adminCount = users.filter(
    user => user.role === 'admin'
  ).length

  const normalCount = users.filter(
    user => user.role === 'user'
  ).length

  const stats = [
    { title: 'Total Users', value: users.length, icon: '♙' },
    { title: 'Administrators', value: adminCount, icon: '♛' },
    { title: 'Normal Users', value: normalCount, icon: '♧' },
    { title: 'Total Locations', value: locations.length, icon: '⌖' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />

      <main className="flex-1 p-8 overflow-x-hidden">

        <div className="mb-8">
          <p className="text-blue-400 text-sm font-semibold">
            ADMINISTRATION
          </p>

          <h1 className="text-3xl font-bold text-white mt-2">
            Admin Dashboard
          </h1>

          <p className="text-slate-400 mt-2">
            Manage QueueLens users and monitor all registered locations.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6"
          >
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-300">
            Loading admin dashboard...
          </p>
        ) : (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                >
                  <div className="flex justify-between items-center">
                    <p className="text-slate-400">
                      {stat.title}
                    </p>

                    <span className="text-2xl text-blue-400">
                      {stat.icon}
                    </span>
                  </div>

                  <p className="text-3xl font-bold text-white mt-4">
                    {stat.value}
                  </p>
                </div>
              ))}

            </div>

            {/* Recent Registered Users */}
            <section className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6">

              <h2 className="text-xl font-semibold text-white mb-5">
                Recent Registered Users
              </h2>

              {users.length === 0 ? (
                <p className="text-slate-400">
                  No users registered yet.
                </p>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full text-left">

                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="py-3">Name</th>
                        <th className="py-3">Email</th>
                        <th className="py-3">Role</th>
                      </tr>
                    </thead>

                    <tbody>
                      {users.slice(0, 5).map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-slate-800 text-slate-300"
                        >
                          <td className="py-4">
                            {user.name}
                          </td>

                          <td className="py-4">
                            {user.email}
                          </td>

                          <td className="py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs ${
                                user.role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>

                </div>
              )}

            </section>
          </>
        )}

      </main>
    </div>
  )
}

export default AdminDashboard
