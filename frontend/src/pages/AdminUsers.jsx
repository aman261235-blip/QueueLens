
import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import apiClient from '../api/apiClient'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/admin/users')
      setUsers(response.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const updateRole = async (userId, role) => {
    setError('')
    setMessage('')
    setUpdatingId(userId)

    try {
      const response = await apiClient.patch(
        `/admin/users/${userId}/role`,
        { role }
      )

      setUsers(current =>
        current.map(user =>
          user.id === userId
            ? { ...user, role: response.data.user.role }
            : user
        )
      )

      setMessage('User role updated successfully.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update role.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Search and role filtering
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchText = search.toLowerCase().trim()

      const matchesSearch =
        user.name?.toLowerCase().includes(searchText) ||
        user.email?.toLowerCase().includes(searchText)

      const matchesRole =
        roleFilter === 'all' || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / pageSize)
  )

  const currentPage = Math.min(page, totalPages)

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const adminCount = users.filter(
    user => user.role === 'admin'
  ).length

  const normalUserCount = users.filter(
    user => user.role === 'user'
  ).length

  const handleSearch = value => {
    setSearch(value)
    setPage(1)
  }

  const handleFilter = value => {
    setRoleFilter(value)
    setPage(1)
  }

  const handlePageSize = value => {
    setPageSize(Number(value))
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />

      <main className="flex-1 p-5 md:p-8 overflow-x-hidden">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              User Management
            </h1>
            <p className="text-slate-400 mt-2">
              Search users, filter accounts and manage access roles.
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-white"
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-7">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-sm">Total Users</p>
            <h2 className="text-3xl font-bold text-white mt-2">
              {users.length}
            </h2>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-sm">Administrators</p>
            <h2 className="text-3xl font-bold text-purple-400 mt-2">
              {adminCount}
            </h2>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-sm">Normal Users</p>
            <h2 className="text-3xl font-bold text-blue-400 mt-2">
              {normalUserCount}
            </h2>
          </div>

        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg p-4 mb-5">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-500/10 text-green-300 border border-green-500/30 rounded-lg p-4 mb-5">
            {message}
          </div>
        )}

        {/* User Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6">

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-white">
              Registered Users
            </h2>

            <p className="text-sm text-slate-400">
              {filteredUsers.length} matching users
            </p>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="md:col-span-2 w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500"
            />

            <select
              value={roleFilter}
              onChange={e => handleFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="all">All Users</option>
              <option value="admin">Administrators</option>
              <option value="user">Normal Users</option>
            </select>

          </div>

          {loading ? (
            <p className="text-slate-300 py-8 text-center">
              Loading users...
            </p>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">
                No matching users found.
              </p>

              <button
                onClick={() => {
                  setSearch('')
                  setRoleFilter('all')
                  setPage(1)
                }}
                className="text-blue-400 hover:text-blue-300 mt-3"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">

                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="py-4 pr-4">ID</th>
                      <th className="py-4 pr-4">Name</th>
                      <th className="py-4 pr-4">Email</th>
                      <th className="py-4 pr-4">Role</th>
                      <th className="py-4">Change Role</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedUsers.map(user => (
                      <tr
                        key={user.id}
                        className="border-b border-slate-800 text-slate-300 hover:bg-slate-800/50"
                      >
                        <td className="py-4 pr-4">{user.id}</td>

                        <td className="py-4 pr-4 font-medium text-white">
                          {user.name}
                        </td>

                        <td className="py-4 pr-4">
                          {user.email}
                        </td>

                        <td className="py-4 pr-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs ${
                              user.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {user.role === 'admin' ? 'Admin' : 'Normal User'}
                          </span>
                        </td>

                        <td className="py-4">
                          <select
                            value={user.role}
                            disabled={updatingId === user.id}
                            onChange={e =>
                              updateRole(user.id, e.target.value)
                            }
                            className="bg-slate-800 border border-slate-700 text-white rounded-lg p-2 disabled:opacity-50"
                          >
                            <option value="user">Normal User</option>
                            <option value="admin">Admin</option>
                          </select>

                          {updatingId === user.id && (
                            <span className="text-xs text-slate-400 ml-2">
                              Updating...
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 border-t border-slate-800 pt-5">

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>Rows per page:</span>

                  <select
                    value={pageSize}
                    onChange={e => handlePageSize(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg p-2"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() =>
                      setPage(p => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>

              </div>
            </>
          )}

        </section>
      </main>
    </div>
  )
}

export default AdminUsers
