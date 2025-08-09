import {
  IconCopy,
  IconEdit,
  IconExternalLink,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
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
import type { Fetcher } from '~/types'
import type { Route } from './+types/fetchers'

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Fetchers - Clashub' },
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
  const fetchers = await kvService.getFetchers()

  return { fetchers }
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
        const url = formData.get('url') as string

        if (!id || !url) {
          return { error: '请填写所有必填字段' }
        }

        if (!validateUrl(url)) {
          return { error: '请输入有效的 URL' }
        }

        const sanitizedId = sanitizeId(id)

        await kvService.saveFetcher({
          id: sanitizedId,
          url,
        })

        return {
          success: `Fetcher "${sanitizedId}" ${action === 'add' ? '添加' : '更新'}成功`,
        }
      }

      case 'delete': {
        const id = formData.get('id') as string
        if (!id) {
          return { error: 'ID 不能为空' }
        }

        const deleted = await kvService.deleteFetcher(id)
        if (!deleted) {
          return { error: 'Fetcher 不存在' }
        }

        return { success: `Fetcher "${id}" 删除成功` }
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

export default function Fetchers() {
  const { fetchers } = useLoaderData<typeof loader>()
  const actionData = useActionData<ActionData>()
  const [editingFetcher, setEditingFetcher] = useState<Fetcher | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ id: '', url: '' })

  const resetForm = () => {
    setFormData({ id: '', url: '' })
    setEditingFetcher(null)
    setShowForm(false)
  }

  const handleEdit = (fetcher: Fetcher) => {
    setFormData({ id: fetcher.id, url: fetcher.url })
    setEditingFetcher(fetcher)
    setShowForm(true)
  }

  const handleAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const copyApiUrl = (fetcherId: string) => {
    const url = `${window.location.origin}/api/v1/fetcher/${fetcherId}?token=YOUR_TOKEN`
    navigator.clipboard.writeText(url)
  }

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // 提交添加/更新成功后，自动清空并关闭表单
  useEffect(() => {
    const message = actionData?.success
    if (!message) return
    if (message.includes('添加') || message.includes('更新')) {
      resetForm()
    }
  }, [actionData?.success])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center h-16">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Fetcher Manager
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              管理您的反向代理 URL
            </p>
          </div>
          <Button onClick={handleAdd}>
            <IconPlus size={16} className="mr-2" />
            添加 Fetcher
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
                {editingFetcher
                  ? `编辑 Fetcher: ${editingFetcher.id}`
                  : '添加新 Fetcher'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <input
                  type="hidden"
                  name="action"
                  value={editingFetcher ? 'edit' : 'add'}
                />
                {editingFetcher && (
                  <input type="hidden" name="id" value={formData.id} />
                )}

                <Input
                  label="Fetcher ID"
                  name="id"
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: e.target.value })
                  }
                  placeholder="例如: my-fetcher"
                  helperText="只能包含小写字母、数字和连字符"
                  disabled={!!editingFetcher}
                  required
                />

                <Input
                  label="Fetcher URL"
                  name="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://example.com/api/data"
                  helperText="要反向代理的目标 URL"
                  required
                />

                <div className="flex space-x-2">
                  <Button type="submit">
                    {editingFetcher ? '更新' : '添加'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    取消
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Fetcher 列表 */}
        <Card>
          <CardHeader>
            <CardTitle>Fetchers ({fetchers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {fetchers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>暂无 Fetcher</p>
                <Button className="mt-4" onClick={handleAdd}>
                  <IconPlus size={16} className="mr-2" />
                  添加第一个 Fetcher
                </Button>
              </div>
            ) : (
              <List>
                {fetchers.map((fetcher) => (
                  <ListItem key={fetcher.id}>
                    <ListContent
                      title={fetcher.id}
                      description={`更新于 ${new Date(fetcher.updatedAt).toLocaleString('zh-CN')}`}
                      actions={
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openUrl(fetcher.url)}
                            title="打开原始 URL"
                          >
                            <IconExternalLink size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyApiUrl(fetcher.id)}
                            title="复制 API URL"
                          >
                            <IconCopy size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(fetcher)}
                          >
                            <IconEdit size={14} />
                          </Button>
                          <Form method="post" className="inline">
                            <input type="hidden" name="action" value="delete" />
                            <input type="hidden" name="id" value={fetcher.id} />
                            <Button
                              size="sm"
                              variant="danger"
                              type="submit"
                              onClick={(e) => {
                                if (
                                  !confirm(`确定要删除 "${fetcher.id}" 吗？`)
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
