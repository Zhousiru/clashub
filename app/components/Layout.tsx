import {
  IconFileText,
  IconLogout,
  IconServer,
  IconSettings,
  IconWorld,
} from '@tabler/icons-react'
import { Link, useLocation } from 'react-router'
import { Button } from './ui/Button'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  {
    name: 'Proxy Providers',
    href: '/proxy-providers',
    icon: IconServer,
  },
  {
    name: 'Configs',
    href: '/configs',
    icon: IconFileText,
  },
  {
    name: 'Fetchers',
    href: '/fetchers',
    icon: IconWorld,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: IconSettings,
  },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* 导航栏 */}
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo 和导航链接 */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link
                  to="/proxy-providers"
                  className="text-xl font-bold text-gray-900 dark:text-gray-100"
                >
                  Clashub
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'border-black dark:border-white text-gray-900 dark:text-gray-100'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon size={16} className="mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* 右侧操作 */}
            <div className="flex items-center">
              <Link to="/logout">
                <Button variant="secondary" size="sm">
                  <IconLogout size={16} className="mr-2" />
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 移动端导航 */}
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200 ${
                    isActive
                      ? 'border-black dark:border-white text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon size={16} className="mr-3" />
                    {item.name}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">{children}</div>
      </main>
    </div>
  )
}
