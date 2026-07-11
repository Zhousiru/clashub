import {
  IconAdjustments,
  IconFileCode,
  IconLogout,
  IconServer,
  IconWorld,
} from '@tabler/icons-react'
import { m } from 'motion/react'
import { Link, useLocation } from 'react-router'
import { cn } from '~/libs/utils'

interface LayoutProps {
  children: React.ReactNode
  fluid?: boolean
}

const navigation = [
  { name: '代理提供商', shortName: '提供商', href: '/proxy-providers', icon: IconServer },
  { name: '配置', shortName: '配置', href: '/configs', icon: IconFileCode },
  { name: '抓取器', shortName: '抓取器', href: '/fetchers', icon: IconWorld },
  { name: '设置', shortName: '设置', href: '/settings', icon: IconAdjustments },
]

export default function Layout({ children, fluid = false }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-dvh bg-white text-gray-950 dark:bg-black dark:text-gray-50">
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sticky)] hidden w-60 border-r border-gray-200 bg-white px-3 py-4 md:flex md:flex-col dark:border-gray-800 dark:bg-black">
        <Link
          to="/proxy-providers"
          className="flex h-11 items-center rounded-[10px] px-3 text-[15px] font-semibold tracking-[-0.02em] outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white"
        >
          <span className="mr-3 grid size-7 place-items-center rounded-[8px] bg-black text-[11px] font-bold text-white dark:bg-white dark:text-black">C</span>
          Clashub
        </Link>

        <nav aria-label="主导航" className="mt-7 space-y-1">
          {navigation.map((item) => {
            const active = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white dark:focus-visible:ring-white',
                  active && 'text-gray-950 dark:text-white',
                )}
              >
                {active && <m.span layoutId="desktop-nav" className="absolute inset-0 -z-10 rounded-[10px] bg-gray-100 dark:bg-gray-900" />}
                <Icon size={18} stroke={1.7} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-gray-200 pt-3 dark:border-gray-800">
          <Link
            to="/logout"
            className="flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white dark:focus-visible:ring-white"
          >
            <IconLogout size={18} stroke={1.7} />
            退出登录
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 md:hidden dark:border-gray-800 dark:bg-black/95">
        <Link to="/proxy-providers" className="flex items-center gap-2 text-sm font-semibold tracking-[-0.02em]">
          <span className="grid size-7 place-items-center rounded-[8px] bg-black text-[11px] font-bold text-white dark:bg-white dark:text-black">C</span>
          Clashub
        </Link>
        <Link to="/logout" aria-label="退出登录" className="grid size-11 place-items-center rounded-[10px] text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-gray-900 dark:hover:text-white">
          <IconLogout size={19} stroke={1.7} />
        </Link>
      </header>

      <main className={cn('min-h-dvh pb-24 md:ml-60 md:pb-0', fluid ? '' : 'md:px-8 lg:px-12')}>
        <div className={cn(fluid ? 'h-full' : 'mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 md:px-0 md:py-10')}>
          {children}
        </div>
      </main>

      <nav aria-label="移动端主导航" className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-gray-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden dark:border-gray-800 dark:bg-black/95">
        <div className="grid grid-cols-4 gap-1">
          {navigation.map((item) => {
            const active = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} to={item.href} aria-current={active ? 'page' : undefined} className={cn('relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-[10px] text-[11px] font-medium text-gray-500', active && 'text-black dark:text-white')}>
                {active && <m.span layoutId="mobile-nav" className="absolute inset-0 -z-10 rounded-[10px] bg-gray-100 dark:bg-gray-900" />}
                <Icon size={18} stroke={active ? 2 : 1.7} />
                {item.shortName}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
