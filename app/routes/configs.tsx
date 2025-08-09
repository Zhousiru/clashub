import Editor from '@monaco-editor/react'
import {
  IconCopy,
  IconDeviceFloppy,
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
import { sanitizeId } from '~/libs/utils'
import { requireAuth } from '~/libs/utils/auth'
import type { Config } from '~/types'
import type { Route } from './+types/configs'

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Configs - Clashub' },
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
  const configs = await kvService.getConfigs()

  return { configs }
}

export async function action({ request, context }: Route.ActionArgs) {
  await requireAuth(request, context)

  const formData = await request.formData()
  const action = formData.get('action') as string

  const kvService = getKVService(context)

  try {
    switch (action) {
      case 'save': {
        const id = formData.get('id') as string
        const content = formData.get('content') as string

        if (!id) {
          return { error: 'Config ID 不能为空' }
        }

        const sanitizedId = sanitizeId(id)

        await kvService.saveConfig({
          id: sanitizedId,
          content: content || '',
        })

        return { success: `Config "${sanitizedId}" 保存成功` }
      }

      case 'create': {
        const id = formData.get('id') as string

        if (!id) {
          return { error: 'Config ID 不能为空' }
        }

        const sanitizedId = sanitizeId(id)

        // 检查是否已存在
        const existingConfig = await kvService.getConfig(sanitizedId)
        if (existingConfig) {
          return { error: `Config "${sanitizedId}" 已存在` }
        }

        await kvService.saveConfig({
          id: sanitizedId,
          content: '',
        })

        return {
          success: `Config "${sanitizedId}" 创建成功`,
        }
      }

      case 'delete': {
        const id = formData.get('id') as string
        if (!id) {
          return { error: 'Config ID 不能为空' }
        }

        const deleted = await kvService.deleteConfig(id)
        if (!deleted) {
          return { error: 'Config 不存在' }
        }

        return { success: `Config "${id}" 删除成功` }
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

export default function Configs() {
  const { configs } = useLoaderData<typeof loader>()
  const actionData = useActionData<ActionData>()
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newConfigId, setNewConfigId] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 创建成功后，仅关闭并清空创建表单（不自动切换）
  useEffect(() => {
    const message = actionData?.success
    if (!message) return
    if (message.includes('创建')) {
      setShowCreateForm(false)
      setNewConfigId('')
    }
  }, [actionData?.success])

  // 保存成功后重置未保存状态
  useEffect(() => {
    const message = actionData?.success
    if (!message) return
    if (message.includes('保存成功')) {
      setHasUnsavedChanges(false)
    }
  }, [actionData?.success])

  // 当 configs 列表变化时，确保选中的 config 仍然有效。
  // 如果当前正在编辑的 config 被删除，则仅清空选择与编辑器，不做自动切换。
  useEffect(() => {
    if (!selectedConfig) return
    const exists = configs.some((c) => c.id === selectedConfig.id)
    if (!exists) {
      setSelectedConfig(null)
      setEditorContent('')
      setHasUnsavedChanges(false)
    }
  }, [configs, selectedConfig])

  // 当选择的配置改变时，更新编辑器内容
  useEffect(() => {
    if (selectedConfig) {
      setEditorContent(selectedConfig.content)
      setHasUnsavedChanges(false)
    } else {
      setEditorContent('')
      setHasUnsavedChanges(false)
    }
  }, [selectedConfig])

  // 监听编辑器内容变化
  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || ''
    setEditorContent(newContent)
    // 只有在有选中配置时才判断是否有未保存的更改
    if (selectedConfig) {
      setHasUnsavedChanges(newContent !== selectedConfig.content)
    } else {
      setHasUnsavedChanges(false)
    }
  }

  const handleConfigSelect = (config: Config) => {
    if (hasUnsavedChanges) {
      if (!confirm('有未保存的更改，确定要切换配置吗？')) {
        return
      }
    }
    setSelectedConfig(config)
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
          <Button onClick={() => setShowCreateForm(true)}>
            <IconPlus size={16} className="mr-2" />
            创建 Config
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
                  helperText="只能包含小写字母、数字和连字符"
                  required
                />

                <div className="flex space-x-2">
                  <Button type="submit">创建</Button>
                  <Button
                    type="button"
                    variant="secondary"
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
                        selected={selectedConfig?.id === config.id}
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
                                <Button
                                  size="sm"
                                  variant="danger"
                                  type="submit"
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
                    {selectedConfig
                      ? `编辑: ${selectedConfig.id}`
                      : '选择一个配置进行编辑'}
                  </CardTitle>
                  {selectedConfig && (
                    <Form method="post">
                      <input type="hidden" name="action" value="save" />
                      <input
                        type="hidden"
                        name="id"
                        value={selectedConfig.id}
                      />
                      <input
                        type="hidden"
                        name="content"
                        value={editorContent}
                      />
                      <Button
                        type="submit"
                        disabled={!hasUnsavedChanges}
                        variant={hasUnsavedChanges ? 'primary' : 'secondary'}
                      >
                        <IconDeviceFloppy size={16} className="mr-2" />
                        {hasUnsavedChanges ? '保存更改' : '已保存'}
                      </Button>
                    </Form>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedConfig ? (
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
