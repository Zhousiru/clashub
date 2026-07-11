import {
  IconCopy,
  IconEdit,
  IconExternalLink,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from 'react-router'
import Layout from '~/components/Layout'
import { Button } from '~/components/ui/Button'
import {
  ConfirmDialog,
  DialogFooter,
  ResponsiveDialog,
} from '~/components/ui/Dialog'
import { Input } from '~/components/ui/Input'
import { List, ListContent, ListItem } from '~/components/ui/List'
import { EmptyState, PageHeader, SectionHeader, Surface } from '~/components/ui/Workspace'
import { notify } from '~/components/ui/notify'
import { FetchersService } from '~/libs/services/clashub'
import { getStoreService, StoreError } from '~/libs/services/store'
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
  intent?: string
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireAuth(request, context)

  const fetchers = await new FetchersService(getStoreService(context)).list()

  return { fetchers }
}

export async function action({ request, context }: Route.ActionArgs) {
  await requireAuth(request, context)

  const formData = await request.formData()
  const action = formData.get('action') as string

  const fetchers = new FetchersService(getStoreService(context))

  try {
    switch (action) {
      case 'add':
      case 'edit': {
        const id = formData.get('id') as string
        const url = formData.get('url') as string
        const expectedRevision = Number(formData.get('revision'))

        if (!id || !url) {
          return { error: '请填写所有必填字段', intent: action }
        }

        if (action === 'add') {
          const fetcher = await fetchers.create(id, url)
          return { success: `Fetcher "${fetcher.id}" 添加成功`, intent: action }
        } else {
          if (!Number.isInteger(expectedRevision)) {
            return { error: '更新请求无效', intent: action }
          }
          const fetcher = await fetchers.update(id, url, expectedRevision)
          return { success: `Fetcher "${fetcher.id}" 更新成功`, intent: action }
        }
      }

      case 'delete': {
        const id = formData.get('id') as string
        const expectedRevision = Number(formData.get('revision'))
        if (!id || !Number.isInteger(expectedRevision)) {
          return { error: 'ID 不能为空', intent: action }
        }

        await fetchers.delete(id, expectedRevision)

        return { success: `Fetcher "${id}" 删除成功`, intent: action }
      }

      default:
        return { error: '无效的操作', intent: action }
    }
  } catch (error) {
    if (error instanceof StoreError && error.status === 409) {
      return {
        error: 'Fetcher 已存在或已被其他请求更新，请刷新后重试',
        intent: action,
      }
    }
    return {
      error: error instanceof Error ? error.message : '操作失败',
      intent: action,
    }
  }
}

export default function Fetchers() {
  const { fetchers } = useLoaderData<typeof loader>()
  const actionData = useActionData<ActionData>()
  const navigation = useNavigation()
  const submit = useSubmit()
  const [editingFetcher, setEditingFetcher] = useState<Fetcher | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Fetcher | null>(null)
  const [formData, setFormData] = useState({ id: '', url: '' })
  const pendingIntent = navigation.formData?.get('action')
  const isMutating = navigation.state !== 'idle'

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

  const copyApiUrl = async (fetcherId: string) => {
    const url = `${window.location.origin}/api/v1/fetcher/${fetcherId}?token=YOUR_TOKEN`
    try {
      await navigator.clipboard.writeText(url)
      notify.copied()
    } catch {
      notify.error('复制失败，请检查浏览器权限')
    }
  }

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (actionData?.success) notify.success(actionData.success)
    if (
      actionData?.error &&
      actionData.intent !== 'add' &&
      actionData.intent !== 'edit'
    ) {
      notify.error(actionData.error)
    }
    if (
      actionData?.success &&
      ['add', 'edit'].includes(actionData.intent || '')
    ) {
      resetForm()
    }
  }, [actionData])

  return (
    <Layout>
      <div className="space-y-8">
        <PageHeader
          eyebrow="资源"
          title="抓取器"
          description="管理反向代理目标，并使用现有操作打开或复制对应地址。"
          action={<Button onClick={handleAdd}>
            <IconPlus size={16} className="mr-2" />
            新建抓取器
          </Button>}
        />

        <ResponsiveDialog
          open={showForm}
          onOpenChange={(open) => {
            if (!open && !isMutating) resetForm()
          }}
          title={editingFetcher ? `编辑 ${editingFetcher.id}` : '新建抓取器'}
          description="填写抓取器 ID 与目标地址。"
        >
          <Form method="post" className="space-y-4">
            <input
              type="hidden"
              name="action"
              value={editingFetcher ? 'edit' : 'add'}
            />
            {editingFetcher && (
              <>
                <input type="hidden" name="id" value={formData.id} />
                <input
                  type="hidden"
                  name="revision"
                  value={editingFetcher.revision}
                />
              </>
            )}

            <Input
              label="Fetcher ID"
              name="id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="例如: my-fetcher"
              helperText="只能包含小写字母、数字、连字符和英文句点"
              disabled={!!editingFetcher}
              autoFocus={!editingFetcher}
              required
            />

            <Input
              label="目标地址"
              name="url"
              type="url"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              placeholder="https://example.com/api/data"
              helperText="要反向代理的目标 URL"
              autoFocus={!!editingFetcher}
              required
            />

            {showForm &&
              actionData?.error &&
              (actionData.intent === 'add' || actionData.intent === 'edit') && (
                <p
                  role="alert"
                  className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                >
                  {actionData.error}
                </p>
              )}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={isMutating}
                onClick={resetForm}
              >
                取消
              </Button>
              <Button type="submit" disabled={isMutating}>
                {pendingIntent === 'add' || pendingIntent === 'edit'
                  ? '处理中…'
                  : editingFetcher
                    ? '保存更改'
                    : '创建抓取器'}
              </Button>
            </DialogFooter>
          </Form>
        </ResponsiveDialog>

        <Surface>
          <SectionHeader title="全部抓取器" count={fetchers.length} />
            {fetchers.length === 0 ? (
              <EmptyState title="暂无抓取器" description="创建第一个抓取器以开始管理反向代理目标。" action={<Button onClick={handleAdd}>
                  <IconPlus size={16} className="mr-2" />
                  新建抓取器
                </Button>} />
            ) : (
              <List>
                {fetchers.map((fetcher) => (
                  <ListItem key={fetcher.id}>
                    <ListContent
                      title={fetcher.id}
                      description={new Date(fetcher.updatedAt).toLocaleString('zh-CN')}
                      actions={
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openUrl(fetcher.url)}
                            title="打开原始 URL"
                            aria-label={`打开 ${fetcher.id} 的原始 URL`}
                          >
                            <IconExternalLink size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyApiUrl(fetcher.id)}
                            title="复制 API URL"
                            aria-label={`复制 ${fetcher.id} 的 API URL`}
                          >
                            <IconCopy size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(fetcher)}
                            title="编辑 Fetcher"
                            aria-label={`编辑 ${fetcher.id}`}
                          >
                            <IconEdit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            type="button"
                            disabled={isMutating}
                            onClick={() => setDeleteTarget(fetcher)}
                            title="删除 Fetcher"
                            aria-label={`删除 ${fetcher.id}`}
                          >
                            <IconTrash size={14} />
                          </Button>
                        </div>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
        </Surface>

        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          title="删除 Fetcher？"
          description={
            deleteTarget
              ? `“${deleteTarget.id}” 将被永久删除，此操作无法撤销。`
              : ''
          }
          confirmLabel="删除 Fetcher"
          pending={isMutating && pendingIntent === 'delete'}
          onConfirm={() => {
            if (!deleteTarget) return
            submit(
              {
                action: 'delete',
                id: deleteTarget.id,
                revision: String(deleteTarget.revision),
              },
              { method: 'post' },
            )
          }}
        />
      </div>
    </Layout>
  )
}
