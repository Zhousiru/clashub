import { IconKey } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router'
import Layout from '~/components/Layout'
import { Button } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'
import { notify } from '~/components/ui/notify'
import { PageHeader, SectionHeader, Surface } from '~/components/ui/Workspace'
import { AuthService, generateTokenCookie } from '~/libs/services/auth'
import { getStoreService } from '~/libs/services/store'
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
  return { success: success ? '密码修改成功' : null }
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
    const authService = new AuthService(getStoreService(context))

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
  const navigation = useNavigation()
  const successMessage = actionData?.success || loaderData.success
  const isChangingPassword =
    navigation.state !== 'idle' &&
    navigation.formData?.get('action') === 'change-password'
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

  useEffect(() => {
    if (successMessage) notify.success(successMessage)
    if (actionData?.error) notify.error(actionData.error)
  }, [actionData, successMessage])

  return (
    <Layout>
      <div className="space-y-8">
        <PageHeader eyebrow="账户" title="设置" description="管理当前 Clashub 实例的访问密码。" />

        <Surface className="max-w-2xl">
          <SectionHeader title="访问密码" description="修改后请使用新密码登录。" />
          <div className="p-5 sm:p-6">
            <Form
              method="post"
              className="max-w-md space-y-5"
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

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button
                  type="submit"
                  disabled={
                    isChangingPassword ||
                    !formData.newToken ||
                    !formData.confirmToken ||
                    formData.newToken !== formData.confirmToken ||
                    formData.newToken.length < 6
                  }
                >
                  <IconKey size={16} className="mr-2" />
                  {isChangingPassword ? '修改中…' : '修改密码'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleReset}>
                  重置
                </Button>
              </div>
            </Form>
          </div>
        </Surface>
      </div>
    </Layout>
  )
}
