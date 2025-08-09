import { IconKey, IconShieldCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { Form, redirect, useActionData, useLoaderData } from 'react-router'
import Layout from '~/components/Layout'
import { Button } from '~/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { Input } from '~/components/ui/Input'
import { AuthService, generateTokenCookie } from '~/libs/services/auth'
import { getKVService } from '~/libs/services/kv'
import { requireAuth } from '~/libs/utils/auth'
import type { Route } from './+types/settings'

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Settings - Clashub' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

interface ActionData {
  error?: string
  success?: string
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireAuth(request, context)
  const url = new URL(request.url)
  const success = url.searchParams.get('success') === '1'
  return success ? { success: '密码修改成功' } : {}
}

export async function action({ request, context }: Route.ActionArgs) {
  const loggedInToken = await requireAuth(request, context)

  const formData = await request.formData()
  const action = formData.get('action') as string

  if (action !== 'change-password') {
    return { error: '无效的操作' }
  }

  const newToken = formData.get('newToken') as string
  const confirmToken = formData.get('confirmToken') as string

  // 验证输入
  if (!newToken || !confirmToken) {
    return { error: '请填写所有字段' }
  }

  if (newToken.length < 6) {
    return { error: '新密码必须至少包含 6 个字符' }
  }

  if (newToken !== confirmToken) {
    return { error: '两次输入的新密码不一致' }
  }

  if (loggedInToken === newToken) {
    return { error: '新密码不能与当前密码相同' }
  }

  try {
    const kvService = getKVService(context)
    const authService = new AuthService(kvService)

    // 安全地更改密码，需要验证当前token
    await authService.changeToken(loggedInToken, newToken)

    // 同步更新 cookie，避免后续请求失效，重定向回当前页展示成功信息
    const cookie = generateTokenCookie(newToken)
    throw redirect('/settings?success=1', {
      headers: {
        'Set-Cookie': cookie,
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      throw error
    }
    return {
      error: error instanceof Error ? error.message : '密码修改失败',
    }
  }
}

export default function Settings() {
  const actionData = useActionData<ActionData>()
  const loaderData = useLoaderData<typeof loader>()
  const successMessage = actionData?.success || (loaderData as any)?.success
  const [formData, setFormData] = useState({
    newToken: '',
    confirmToken: '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleReset = () => {
    setFormData({
      newToken: '',
      confirmToken: '',
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center h-16">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Settings
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              管理您的账户设置
            </p>
          </div>
        </div>

        {/* 成功/错误消息 */}
        {successMessage && (
          <div className="p-4 border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <div className="flex items-center">
              <IconShieldCheck size={20} className="mr-2" />
              {successMessage}
            </div>
          </div>
        )}
        {actionData?.error && (
          <div className="p-4 border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {actionData.error}
          </div>
        )}

        {/* 修改密码 */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <IconKey size={20} />
              <CardTitle>修改密码</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Form
              method="post"
              className="space-y-4"
              onSubmit={(e) => {
                const isValid =
                  formData.newToken &&
                  formData.confirmToken &&
                  formData.newToken === formData.confirmToken &&
                  formData.newToken.length >= 6
                if (!isValid) {
                  e.preventDefault()
                }
              }}
            >
              <input type="hidden" name="action" value="change-password" />

              <Input
                type="password"
                name="newToken"
                label="新密码"
                value={formData.newToken}
                onChange={(e) => handleInputChange('newToken', e.target.value)}
                placeholder="请输入新密码（至少 6 个字符）"
                autoComplete="new-password"
                minLength={6}
                required
              />

              <Input
                type="password"
                name="confirmToken"
                label="确认新密码"
                value={formData.confirmToken}
                onChange={(e) =>
                  handleInputChange('confirmToken', e.target.value)
                }
                placeholder="请再次输入新密码"
                autoComplete="new-password"
                error={
                  formData.confirmToken &&
                  formData.newToken !== formData.confirmToken
                    ? '两次输入的密码不一致'
                    : undefined
                }
                required
              />

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={
                    !formData.newToken ||
                    !formData.confirmToken ||
                    formData.newToken !== formData.confirmToken ||
                    formData.newToken.length < 6
                  }
                >
                  <IconKey size={16} className="mr-2" />
                  修改密码
                </Button>
                <Button type="button" variant="secondary" onClick={handleReset}>
                  重置
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
