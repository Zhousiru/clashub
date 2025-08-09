import { IconCopy, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Form, useActionData, useLoaderData } from 'react-router'
import Layout from '~/components/Layout'
import { Button } from '~/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { Input } from '~/components/ui/Input'
import { List, ListContent, ListItem } from '~/components/ui/List'
import { getKVService } from '~/libs/services/kv'
import { sanitizeId, validateUrl } from '~/libs/utils'
import { requireAuth } from '~/libs/utils/auth'
import type { ProxyProvider } from '~/types'
import type { Route } from './+types/proxy-providers'

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Proxy Providers - Clashub' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

interface ActionData {
  error?: string
  success?: string
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireAuth(request, context)

  const kvService = getKVService(context)
  const providers = await kvService.getProxyProviders()

  return { providers }
}

export async function action({ request, context }: Route.ActionArgs) {
  await requireAuth(request, context)

  const formData = await request.formData()
  const action = formData.get('action') as string

  const kvService = getKVService(context)

  try {
    switch (action) {
      case 'add':
      case 'edit': {
        const id = formData.get('id') as string
        const subscriptionUrl = formData.get('subscriptionUrl') as string

        if (!id || !subscriptionUrl) {
          return { error: '请填写所有必填字段' }
        }

        if (!validateUrl(subscriptionUrl)) {
          return { error: '请输入有效的 URL' }
        }

        const sanitizedId = sanitizeId(id)

        await kvService.saveProxyProvider({
          id: sanitizedId,
          subscriptionUrl,
        })

        return {
          success: `Proxy Provider "${sanitizedId}" ${action === 'add' ? '添加' : '更新'}成功`,
        }
      }

      case 'delete': {
        const id = formData.get('id') as string
        if (!id) {
          return { error: 'ID 不能为空' }
        }

        const deleted = await kvService.deleteProxyProvider(id)
        if (!deleted) {
          return { error: 'Proxy Provider 不存在' }
        }

        return { success: `Proxy Provider "${id}" 删除成功` }
      }

      default:
        return { error: '无效的操作' }
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '操作失败',
    }
  }
}

export default function ProxyProviders() {
  const { providers } = useLoaderData<typeof loader>()
  const actionData = useActionData<ActionData>()
  const [editingProvider, setEditingProvider] = useState<ProxyProvider | null>(
    null
  )
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ id: '', subscriptionUrl: '' })

  const resetForm = () => {
    setFormData({ id: '', subscriptionUrl: '' })
    setEditingProvider(null)
    setShowForm(false)
  }

  // 提交添加/更新成功后，自动清空并关闭表单
  useEffect(() => {
    const message = actionData?.success
    if (!message) return
    if (message.includes('添加') || message.includes('更新')) {
      resetForm()
    }
  }, [actionData?.success])

  const handleEdit = (provider: ProxyProvider) => {
    setFormData({ id: provider.id, subscriptionUrl: provider.subscriptionUrl })
    setEditingProvider(provider)
    setShowForm(true)
  }

  const handleAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const copyApiUrl = (sourceId: string) => {
    const url = `${window.location.origin}/api/v1/proxy-provider/${sourceId}?token=YOUR_TOKEN`
    navigator.clipboard.writeText(url)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center h-16">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Proxy Provider Manager
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              管理您的 Clash 订阅链接
            </p>
          </div>
          <Button onClick={handleAdd}>
            <IconPlus size={16} className="mr-2" />
            添加 Provider
          </Button>
        </div>

        {/* 成功/错误消息 */}
        {actionData?.success && (
          <div className="p-4 border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            {actionData.success}
          </div>
        )}
        {actionData?.error && (
          <div className="p-4 border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {actionData.error}
          </div>
        )}

        {/* 添加/编辑表单 */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingProvider
                  ? `编辑 Provider: ${editingProvider.id}`
                  : '添加新 Provider'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <input
                  type="hidden"
                  name="action"
                  value={editingProvider ? 'edit' : 'add'}
                />
                {editingProvider && (
                  <input type="hidden" name="id" value={formData.id} />
                )}

                <Input
                  label="Source ID"
                  name="id"
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: e.target.value })
                  }
                  placeholder="例如: my-provider"
                  helperText="只能包含小写字母、数字、连字符和英文句点"
                  disabled={!!editingProvider}
                  required
                />

                <Input
                  label="Subscription URL"
                  name="subscriptionUrl"
                  type="url"
                  value={formData.subscriptionUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscriptionUrl: e.target.value,
                    })
                  }
                  placeholder="https://example.com/clash/config"
                  required
                />

                <div className="flex space-x-2">
                  <Button type="submit">
                    {editingProvider ? '更新' : '添加'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    取消
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Provider 列表 */}
        <Card>
          <CardHeader>
            <CardTitle>Proxy Providers ({providers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {providers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>暂无 Proxy Provider</p>
                <Button className="mt-4" onClick={handleAdd}>
                  <IconPlus size={16} className="mr-2" />
                  添加第一个 Provider
                </Button>
              </div>
            ) : (
              <List>
                {providers.map((provider) => (
                  <ListItem key={provider.id}>
                    <ListContent
                      title={provider.id}
                      description={`更新于 ${new Date(provider.updatedAt).toLocaleString('zh-CN')}`}
                      actions={
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyApiUrl(provider.id)}
                          >
                            <IconCopy size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(provider)}
                          >
                            <IconEdit size={14} />
                          </Button>
                          <Form method="post" className="inline">
                            <input type="hidden" name="action" value="delete" />
                            <input
                              type="hidden"
                              name="id"
                              value={provider.id}
                            />
                            <Button
                              size="sm"
                              variant="danger"
                              type="submit"
                              onClick={(e) => {
                                if (
                                  !confirm(`确定要删除 "${provider.id}" 吗？`)
                                ) {
                                  e.preventDefault()
                                }
                              }}
                            >
                              <IconTrash size={14} />
                            </Button>
                          </Form>
                        </div>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
