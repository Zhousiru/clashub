import Editor from '@monaco-editor/react'
import {
  IconCopy,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import Layout from '~/components/Layout'
import { Button } from '~/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { Input } from '~/components/ui/Input'
import { List, ListContent, ListItem } from '~/components/ui/List'
import { ConfigsService } from '~/libs/services/clashub'
import { getStoreService, StoreError } from '~/libs/services/store'
import { requireAuth } from '~/libs/utils/auth'
import type { Config } from '~/types'
import type { Route } from './+types/configs'

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Configs - Clashub' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

type ActionData =
  | { success: string; intent: 'save'; config: Config }
  | { success: string; intent: 'create'; config: Config }
  | { success: string; intent: 'delete'; id: string }
  | { error: string; intent?: string }

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireAuth(request, context)

  const configs = await new ConfigsService(getStoreService(context)).list()

  return { configs }
}

export async function action({ request, context }: Route.ActionArgs) {
  await requireAuth(request, context)

  const formData = await request.formData()
  const intent = formData.get('action') as string

  const configs = new ConfigsService(getStoreService(context))

  try {
    switch (intent) {
      case 'save': {
        const id = formData.get('id') as string
        const content = formData.get('content') as string
        const expectedRevision = Number(formData.get('revision'))

        if (!id || !Number.isInteger(expectedRevision)) {
          return { error: '保存请求无效', intent }
        }

        const config = await configs.update(
          id,
          content || '',
          expectedRevision,
        )

        return {
          success: `Config "${config.id}" 保存成功`,
          intent,
          config,
        }
      }

      case 'create': {
        const id = formData.get('id') as string

        if (!id) {
          return { error: 'Config ID 不能为空' }
        }

        const config = await configs.create(id)

        return {
          success: `Config "${config.id}" 创建成功`,
          intent,
          config,
        }
      }

      case 'delete': {
        const id = formData.get('id') as string
        const expectedRevision = Number(formData.get('revision'))
        if (!id || !Number.isInteger(expectedRevision)) {
          return { error: '删除请求无效', intent }
        }

        await configs.delete(id, expectedRevision)

        return { success: `Config "${id}" 删除成功`, intent, id }
      }

      default:
        return { error: '无效的操作', intent }
    }
  } catch (error) {
    if (error instanceof StoreError && error.status === 409) {
      return {
        error:
          intent === 'create'
            ? 'Config 已存在'
            : '配置已被其他请求更新，请重新选择后再试',
        intent,
      }
    }
    return {
      error: error instanceof Error ? error.message : '操作失败',
      intent,
    }
  }
}

export default function Configs() {
  const { configs } = useLoaderData<typeof loader>()
  const actionData = useActionData<ActionData>()
  const navigation = useNavigation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [lastSavedContent, setLastSavedContent] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newConfigId, setNewConfigId] = useState('')
  const pendingIntent = navigation.formData?.get('action')
  const isMutating = navigation.state !== 'idle' && pendingIntent !== null
  const isSaving = isMutating && pendingIntent === 'save'
  const hasUnsavedChanges =
    selectedId !== null && editorContent !== lastSavedContent

  // 使用结构化操作响应更新对应配置，避免重复文案和跨配置响应污染状态。
  useEffect(() => {
    if (!actionData || !('success' in actionData)) return

    if (actionData.intent === 'create') {
      setShowCreateForm(false)
      setNewConfigId('')
    }

    if (actionData.intent === 'save' && actionData.config.id === selectedId) {
      setLastSavedContent(actionData.config.content)
      setSelectedRevision(actionData.config.revision)
    }

    if (actionData.intent === 'delete' && actionData.id === selectedId) {
      setSelectedId(null)
      setSelectedRevision(null)
      setEditorContent('')
      setLastSavedContent('')
    }
  }, [actionData])

  // 当 configs 列表变化时，确保选中的 config 仍然有效。
  // 如果当前正在编辑的 config 被删除，则仅清空选择与编辑器，不做自动切换。
  useEffect(() => {
    if (!selectedId) return
    const exists = configs.some((config) => config.id === selectedId)
    if (!exists) {
      setSelectedId(null)
      setSelectedRevision(null)
      setEditorContent('')
      setLastSavedContent('')
    }
  }, [configs, selectedId])

  // 监听编辑器内容变化
  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || ''
    setEditorContent(newContent)
  }

  const handleConfigSelect = (config: Config) => {
    if (isMutating) return
    if (hasUnsavedChanges) {
      if (!confirm('有未保存的更改，确定要切换配置吗？')) {
        return
      }
    }
    setSelectedId(config.id)
    setSelectedRevision(config.revision)
    setEditorContent(config.content)
    setLastSavedContent(config.content)
  }

  const copyApiUrl = (configId: string) => {
    const url = `${window.location.origin}/api/v1/config/${configId}?token=YOUR_TOKEN`
    navigator.clipboard.writeText(url)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center h-16">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Config Manager
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              管理您的 YAML 配置文件
            </p>
          </div>
          <Button disabled={isMutating} onClick={() => setShowCreateForm(true)}>
            <IconPlus size={16} className="mr-2" />
            创建 Config
          </Button>
        </div>

        {/* 成功/错误消息 */}
        {actionData && 'success' in actionData && (
          <div className="p-4 border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            {actionData.success}
          </div>
        )}
        {actionData && 'error' in actionData && (
          <div className="p-4 border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {actionData.error}
          </div>
        )}

        {/* 创建表单 */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>创建新配置</CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="action" value="create" />

                <Input
                  label="Config ID"
                  name="id"
                  value={newConfigId}
                  onChange={(e) => setNewConfigId(e.target.value)}
                  placeholder="例如: my-config"
                  helperText="只能包含小写字母、数字、连字符和英文句点"
                  disabled={isMutating}
                  required
                />

                <div className="flex space-x-2">
                  <Button type="submit" disabled={isMutating}>
                    {pendingIntent === 'create' ? '创建中' : '创建'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isMutating}
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewConfigId('')
                    }}
                  >
                    取消
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* 双栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：Config 列表 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Configs ({configs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {configs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">暂无配置</p>
                  </div>
                ) : (
                  <List>
                    {configs.map((config) => (
                      <ListItem
                        key={config.id}
                        selected={selectedId === config.id}
                        onSelect={() => handleConfigSelect(config)}
                      >
                        <ListContent
                          title={config.id}
                          description={`更新于 ${new Date(config.updatedAt).toLocaleDateString('zh-CN')}`}
                          actions={
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyApiUrl(config.id)
                                }}
                              >
                                <IconCopy size={12} />
                              </Button>
                              <Form method="post" className="inline">
                                <input
                                  type="hidden"
                                  name="action"
                                  value="delete"
                                />
                                <input
                                  type="hidden"
                                  name="id"
                                  value={config.id}
                                />
                                <input
                                  type="hidden"
                                  name="revision"
                                  value={config.revision}
                                />
                                <Button
                                  size="sm"
                                  variant="danger"
                                  type="submit"
                                  disabled={isMutating}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (
                                      !confirm(`确定要删除 "${config.id}" 吗？`)
                                    ) {
                                      e.preventDefault()
                                    }
                                  }}
                                >
                                  <IconTrash size={12} />
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

          {/* 右侧：编辑器 */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {selectedId
                      ? `编辑: ${selectedId}`
                      : '选择一个配置进行编辑'}
                  </CardTitle>
                  {selectedId && selectedRevision !== null && (
                    <Form method="post">
                      <input type="hidden" name="action" value="save" />
                      <input type="hidden" name="id" value={selectedId} />
                      <input
                        type="hidden"
                        name="revision"
                        value={selectedRevision}
                      />
                      <input
                        type="hidden"
                        name="content"
                        value={editorContent}
                      />
                      <Button
                        type="submit"
                        disabled={!hasUnsavedChanges || isMutating}
                        variant={hasUnsavedChanges ? 'primary' : 'secondary'}
                      >
                        <IconDeviceFloppy size={16} className="mr-2" />
                        {isSaving
                          ? '保存中'
                          : hasUnsavedChanges
                            ? '保存更改'
                            : '已保存'}
                      </Button>
                    </Form>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedId ? (
                  <div className="h-96 border border-gray-200 dark:border-gray-800">
                    <Editor
                      height="100%"
                      defaultLanguage="yaml"
                      value={editorContent}
                      onChange={handleEditorChange}
                      theme="vs"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        detectIndentation: false,
                        readOnly: isMutating,
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                    <div className="text-center">
                      <p>请从左侧选择一个配置文件进行编辑</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
