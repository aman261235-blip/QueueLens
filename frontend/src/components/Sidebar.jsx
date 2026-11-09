
import { NavLink } from 'react-router-dom'

function Sidebar() {
  const user = JSON.parse(
    localStorage.getItem('queuelens_user') || 'null'
  )

  const isAdmin = user?.role === 'admin'

  const handleLogout = () => {
    localStorage.removeItem('queuelens_token')
    localStorage.removeItem('queuelens_user')
    window.location.replace('/login')
  }

  const userNavigation = [
    { name: 'Dashboard', path: '/dashboard', icon: '▦' },
    { name: 'Queue History', path: '/history', icon: '◷' },
    { name: 'Analytics', path: '/analytics', icon: '▥' },
  ]

  const adminNavigation = [
    { name: 'Admin Dashboard', path: '/admin', icon: '▦' },
    { name: 'Global Analytics', path: '/admin/analytics', icon: '▥' },
    { name: 'User Management', path: '/admin/users', icon: '♙' },
    { name: 'All Locations', path: '/admin/locations', icon: '⌖' },
    { name: 'Activity Logs', path: '/admin/activity-logs', icon: '◷' },
  ]

  const navigation = isAdmin ? adminNavigation : userNavigation

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 p-6 flex flex-col shrink-0">
      <h1 className="text-2xl font-bold text-white mb-8">
        Queue<span className="text-blue-500">Lens</span>
      </h1>

      <div className="mb-6">
        <span className={`text-xs px-3 py-1 rounded-full ${
          isAdmin
            ? 'bg-purple-500/20 text-purple-300'
            : 'bg-blue-500/20 text-blue-300'
        }`}>
          {isAdmin ? 'ADMIN ACCOUNT' : 'USER ACCOUNT'}
        </span>
      </div>

      <p className="text-slate-500 text-xs uppercase mb-4 tracking-wider">
        {isAdmin ? 'Administration' : 'Main Menu'}
      </p>

      <nav className="space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin' || item.path === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-800 pt-5">
        <div className="mb-4">
          <p className="text-white font-medium">
            {user?.name || 'QueueLens User'}
          </p>
          <p className="text-slate-500 text-xs mt-1 break-all">
            {user?.email || ''}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white p-3 rounded-lg transition-colors text-left"
        >
          ↪ Logout
        </button>

        <p className="text-slate-500 text-xs mt-5">
          QueueLens v1.0
        </p>
      </div>
    </aside>
  )
}

export default Sidebar
