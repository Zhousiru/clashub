import { redirect } from 'react-router'
import type { Route } from './+types/index'

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Clashub' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

export async function loader({ request, context }: Route.LoaderArgs) {
  // 重定向到 proxy-providers 页面
  throw redirect('/proxy-providers')
}

export default function Index() {
  return null
}
