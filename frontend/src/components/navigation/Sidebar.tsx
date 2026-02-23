import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCategories } from '../../services/firestore'
import { HomeIcon, UserIcon, SearchIcon } from '../icons'
import { categoryColors } from '../../constants/categories'
import clsx from 'clsx'

interface SidebarProps {
  collapsed?: boolean
}

const navLinks = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/arena', label: 'Browse', icon: SearchIcon },
  { to: '/create', label: 'Create', icon: CreateIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
]

function CreateIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="4" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" />
    </svg>
  )
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const location = useLocation()
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  return (
    <aside
      className={clsx(
        'hidden md:flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : to === '/profile'
            ? location.pathname.startsWith('/profile') || location.pathname.startsWith('/settings')
            : location.pathname.startsWith(to)
          if (to === '/create') {
            return (
              <Link
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors mt-1 mb-1',
                  isActive
                    ? 'bg-primary-600 dark:bg-violet-600 text-white'
                    : 'bg-primary-50 dark:bg-violet-950/50 text-primary-700 dark:text-violet-400 hover:bg-primary-100 dark:hover:bg-violet-900/50'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>Create</span>}
              </Link>
            )
          }

          return (
            <Link
              key={to}
              to={to}
              className={clsx(
                'sidebar-link',
                isActive && 'sidebar-link-active'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {categories && categories.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-800 py-4 px-2">
          {!collapsed && (
            <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Topics
            </h3>
          )}
          <div className="space-y-1">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="sidebar-link cursor-default"
                title={collapsed ? cat.name : undefined}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: categoryColors[cat.name as keyof typeof categoryColors] || '#9ca3af' }}
                />
                {!collapsed && (
                  <span className="text-sm truncate">{cat.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
