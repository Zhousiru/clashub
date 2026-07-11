import { useState } from 'react'
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useSearchParams,
} from 'react-router'
import { Button } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'
import { AuthService, generateTokenCookie } from '~/libs/services/auth'
import { getStoreService } from '~/libs/services/store'
import { optionalAuth } from '~/libs/utils/auth'
import type { Route } from './+types/login'

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Login - Clashub' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

interface ActionData {
  error?: string
  success?: boolean
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url)

  // 检查用户是否已经登录
  const authStatus = await optionalAuth(request, context)

  // 如果已经登录，直接重定向到 proxy-providers
  if (authStatus.isAuthenticated) {
    throw redirect('/proxy-providers')
  }

  // 如果需要设置且当前 URL 没有 setup=true 参数，则重定向到设置页面
  if (authStatus.needsSetup && url.searchParams.get('setup') !== 'true') {
    throw redirect('/login?setup=true')
  }

  return {
    needsSetup: authStatus.needsSetup,
    isSetup: url.searchParams.get('setup') === 'true',
    error: url.searchParams.get('error'),
  }
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData()
  const token = formData.get('token') as string
  const isSetup = formData.get('setup') === 'true'

  if (!token || token.length < 6) {
    return {
      error: '密码必须至少包含 6 个字符',
    }
  }

  try {
    const authService = new AuthService(getStoreService(context))

    if (isSetup) {
      // 初次设置密码
      await authService.initializeToken(token)
    } else {
      // 验证登录
      const isValid = await authService.verifyToken(token)
      if (!isValid) {
        return {
          error: '密码不正确',
        }
      }
    }

    // 设置 cookie 并重定向
    const cookie = generateTokenCookie(token)
    throw redirect('/proxy-providers', {
      headers: {
        'Set-Cookie': cookie,
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      throw error // 重定向响应
    }

    return {
      error: error instanceof Error ? error.message : '发生未知错误',
    }
  }
}

export default function Login() {
  const {
    needsSetup,
    isSetup,
    error: urlError,
  } = useLoaderData<typeof loader>()
  const actionData = useActionData<ActionData>()
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState('')

  const showSetup = needsSetup && isSetup
  const error =
    actionData?.error ||
    (urlError === 'invalid' ? '密码无效，请重新登录' : undefined)

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 py-12 dark:bg-black">
      <section className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-6 grid size-10 place-items-center rounded-[10px] bg-black text-sm font-bold text-white dark:bg-white dark:text-black">C</div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-gray-950 dark:text-gray-50">
            {showSetup ? '设置 Clashub' : '登录 Clashub'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
            {showSetup
              ? '请设置您的访问密码，此密码将用于后续登录'
              : '请输入您的访问密码'}
          </p>
        </div>

        <div>
          <Form method="post" className="space-y-4">
            <input
              type="hidden"
              name="setup"
              value={showSetup ? 'true' : 'false'}
            />

            <Input
              type="password"
              name="token"
              label={showSetup ? '设置密码' : '访问密码'}
              placeholder={showSetup ? '密码至少 6 个字符' : '请输入密码'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              error={error}
              required
              minLength={6}
              autoComplete={showSetup ? 'new-password' : 'current-password'}
              autoFocus
            />

            <Button
              type="submit"
              className="w-full"
              disabled={token.length < 6}
            >
              {showSetup ? '设置密码' : '登录'}
            </Button>
          </Form>

          {showSetup && <p className="mt-5 border-t border-gray-200 pt-5 text-xs leading-5 text-gray-500 dark:border-gray-800 dark:text-gray-400">请妥善保存密码。系统不支持找回，但可以在设置页修改。</p>}
        </div>
      </section>
    </main>
  )
}
