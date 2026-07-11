import { IconCopy, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
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
import { ProxyProvidersService } from '~/libs/services/clashub'
import { getStoreService, StoreError } from '~/libs/services/store'
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
  intent?: string
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireAuth(request, context)

  const providers = await new ProxyProvidersService(
    getStoreService(context),
  ).list()

  return { providers }
}

export async function action({ request, context }: Route.ActionArgs) {
  await requireAuth(request, context)

  const formData = await request.formData()
  const action = formData.get('action') as string

  const providers = new ProxyProvidersService(getStoreService(context))

  try {
    switch (action) {
      case 'add':
      case 'edit': {
        const id = formData.get('id') as string
        const subscriptionUrl = formData.get('subscriptionUrl') as string
        const renamePattern = formData.get('renamePattern') as string
        const renameReplacement = formData.get('renameReplacement') as string
        const expectedRevision = Number(formData.get('revision'))

        if (!id || !subscriptionUrl) {
          return { error: '请填写所有必填字段', intent: action }
        }

        if (action === 'add') {
          const provider = await providers.create(
            id,
            subscriptionUrl,
            renamePattern,
            renameReplacement,
          )
          return {
            success: `Proxy Provider "${provider.id}" 添加成功`,
            intent: action,
          }
        } else {
          if (!Number.isInteger(expectedRevision)) {
            return { error: '更新请求无效', intent: action }
          }
          const provider = await providers.update(
            id,
            subscriptionUrl,
            expectedRevision,
            renamePattern,
            renameReplacement,
          )
          return {
            success: `Proxy Provider "${provider.id}" 更新成功`,
            intent: action,
          }
        }
      }

      case 'delete': {
        const id = formData.get('id') as string
        const expectedRevision = Number(formData.get('revision'))
        if (!id || !Number.isInteger(expectedRevision)) {
          return { error: 'ID 不能为空', intent: action }
        }

        await providers.delete(id, expectedRevision)

        return { success: `Proxy Provider "${id}" 删除成功`, intent: action }
      }

      default:
        return { error: '无效的操作', intent: action }
    }
  } catch (error) {
    if (error instanceof StoreError && error.status === 409) {
      return {
        error: 'Provider 已存在或已被其他请求更新，请刷新后重试',
        intent: action,
      }
    }
    return {
      error: error instanceof Error ? error.message : '操作失败',
      intent: action,
    }
  }
}

export default function ProxyProviders() {
  const { providers } = useLoaderData<typeof loader>()
  const actionData = useActionData<ActionData>()
  const navigation = useNavigation()
  const submit = useSubmit()
  const [editingProvider, setEditingProvider] = useState<ProxyProvider | null>(
    null,
  )
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProxyProvider | null>(null)
  const [formData, setFormData] = useState({
    id: '',
    subscriptionUrl: '',
    renamePattern: '',
    renameReplacement: '',
  })
  const pendingIntent = navigation.formData?.get('action')
  const isMutating = navigation.state !== 'idle'

  const resetForm = () => {
    setFormData({
      id: '',
      subscriptionUrl: '',
      renamePattern: '',
      renameReplacement: '',
    })
    setEditingProvider(null)
    setShowForm(false)
  }

  useEffect(() => {
    if (actionData?.success) {
      notify.success(actionData.success)
    }
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

  const handleEdit = (provider: ProxyProvider) => {
    setFormData({
      id: provider.id,
      subscriptionUrl: provider.subscriptionUrl,
      renamePattern: provider.renamePattern ?? '',
      renameReplacement: provider.renameReplacement ?? '',
    })
    setEditingProvider(provider)
    setShowForm(true)
  }

  const handleAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const renamePatternError = (() => {
    if (!formData.renamePattern) return undefined
    if (formData.renamePattern.length > 256) return '正则不能超过 256 个字符'
    try {
      new RegExp(formData.renamePattern, 'g')
      return undefined
    } catch {
      return '请输入有效的 JavaScript 正则表达式'
    }
  })()

  const copyApiUrl = async (sourceId: string) => {
    const url = `${window.location.origin}/api/v1/proxy-provider/${sourceId}?token=YOUR_TOKEN`
    try {
      await navigator.clipboard.writeText(url)
      notify.copied()
    } catch {
      notify.error('复制失败，请检查浏览器权限')
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <PageHeader
          eyebrow="资源"
          title="代理提供商"
          description="管理 Clash 订阅来源，并复制已有资源对应的 API 地址。"
          action={<Button onClick={handleAdd}>
            <IconPlus size={16} className="mr-2" />
            新建提供商
          </Button>}
        />

        <ResponsiveDialog
          open={showForm}
          onOpenChange={(open) => {
            if (!open && !isMutating) resetForm()
          }}
          title={editingProvider ? `编辑 ${editingProvider.id}` : '新建代理提供商'}
          description="填写订阅来源，并可选择用正则统一整理节点名称。"
        >
          <Form method="post" className="space-y-4">
            <input
              type="hidden"
              name="action"
              value={editingProvider ? 'edit' : 'add'}
            />
            {editingProvider && (
              <>
                <input type="hidden" name="id" value={formData.id} />
                <input
                  type="hidden"
                  name="revision"
                  value={editingProvider.revision}
                />
              </>
            )}

            <Input
              label="Source ID"
              name="id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="例如: my-provider"
              helperText="只能包含小写字母、数字、连字符和英文句点"
              disabled={!!editingProvider}
              autoFocus={!editingProvider}
              required
            />

            <Input
              label="节点名称匹配正则"
              name="renamePattern"
              value={formData.renamePattern}
              onChange={(e) =>
                setFormData({ ...formData, renamePattern: e.target.value })
              }
              placeholder="例如: ^(.*?)\s+-\s+(.*)$"
              helperText="留空表示不改名；默认全局匹配并区分大小写"
              error={renamePatternError}
              maxLength={256}
              spellCheck={false}
            />

            <Input
              label="节点名称替换模板"
              name="renameReplacement"
              value={formData.renameReplacement}
              onChange={(e) =>
                setFormData({ ...formData, renameReplacement: e.target.value })
              }
              placeholder="例如: $1 · $2"
              helperText="支持 $1、$2、$&、$<name> 和 $$；允许留空以删除匹配内容"
              maxLength={512}
              spellCheck={false}
            />

            <Input
              label="订阅地址"
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
              autoFocus={!!editingProvider}
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
              <Button type="submit" disabled={isMutating || !!renamePatternError}>
                {pendingIntent === 'add' || pendingIntent === 'edit'
                  ? '处理中…'
                  : editingProvider
                    ? '保存更改'
                    : '创建提供商'}
              </Button>
            </DialogFooter>
          </Form>
        </ResponsiveDialog>

        <Surface>
          <SectionHeader title="全部提供商" count={providers.length} />
            {providers.length === 0 ? (
              <EmptyState title="暂无代理提供商" description="创建第一个提供商以开始管理订阅来源。" action={<Button onClick={handleAdd}>
                  <IconPlus size={16} className="mr-2" />
                  新建提供商
                </Button>} />
            ) : (
              <List>
                {providers.map((provider) => (
                  <ListItem key={provider.id}>
                    <ListContent
                      title={provider.id}
                      description={`${
                        provider.renamePattern ? '已配置节点改名 · ' : ''
                      }${new Date(provider.updatedAt).toLocaleString('zh-CN')}`}
                      actions={
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyApiUrl(provider.id)}
                            aria-label={`复制 ${provider.id} 的 API URL`}
                            title="复制 API URL"
                          >
                            <IconCopy size={15} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(provider)}
                            aria-label={`编辑 ${provider.id}`}
                            title="编辑 Provider"
                          >
                            <IconEdit size={15} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            type="button"
                            disabled={isMutating}
                            onClick={() => setDeleteTarget(provider)}
                            aria-label={`删除 ${provider.id}`}
                            title="删除 Provider"
                          >
                            <IconTrash size={15} />
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
          title="删除 Proxy Provider？"
          description={
            deleteTarget
              ? `“${deleteTarget.id}” 将被永久删除，此操作无法撤销。`
              : ''
          }
          confirmLabel="删除 Provider"
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
