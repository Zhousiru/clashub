import { redirect } from 'react-router'
import { generateClearTokenCookie } from '~/libs/services/auth'
import type { Route } from './+types/logout'

export async function action({ request }: Route.ActionArgs) {
  // 清除 token cookie 并重定向到登录页
  const cookie = generateClearTokenCookie()
  throw redirect('/login', {
    headers: {
      'Set-Cookie': cookie,
    },
  })
}

export async function loader() {
  // GET 请求时清除 token cookie 并重定向到登录页
  const cookie = generateClearTokenCookie()
  throw redirect('/login', {
    headers: {
      'Set-Cookie': cookie,
    },
  })
}

export default function Logout() {
  return null
}
