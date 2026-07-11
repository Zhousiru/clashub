import Editor from '@monaco-editor/react'
import {
  IconAlertTriangle,
  IconChevronLeft,
  IconCircleX,
  IconCopy,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import type { editor } from 'monaco-editor'
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
import { notify } from '~/components/ui/notify'
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

type YamlLanguageServiceState = 'loading' | 'ready' | 'fallback'

interface ValidationIssues {
  errors: number
  warnings: number
}

const MONACO_MARKER_WARNING = 4
const MONACO_MARKER_ERROR = 8

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

        const config = await configs.update(id, content || '', expectedRevision)

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
  const submit = useSubmit()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [lastSavedContent, setLastSavedContent] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newConfigId, setNewConfigId] = useState('')
  const [pendingSelection, setPendingSelection] = useState<Config | null>(null)
  const [pendingListReturn, setPendingListReturn] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Config | null>(null)
  const [yamlLanguageService, setYamlLanguageService] =
    useState<YamlLanguageServiceState>('loading')
  const [validationIssues, setValidationIssues] =
    useState<ValidationIssues | null>(null)
  const pendingIntent = navigation.formData?.get('action')
  const isMutating = navigation.state !== 'idle' && pendingIntent !== null
  const isSaving = isMutating && pendingIntent === 'save'
  const hasUnsavedChanges =
    selectedId !== null && editorContent !== lastSavedContent

  useEffect(() => {
    if (!selectedId || yamlLanguageService !== 'loading') return

    let active = true

    import('~/libs/monaco-yaml.client')
      .then(({ initializeMonacoYaml }) => {
        initializeMonacoYaml()
        if (active) setYamlLanguageService('ready')
      })
      .catch((error) => {
        console.error('Failed to initialize the YAML language service', error)
        if (active) {
          setYamlLanguageService('fallback')
          notify.error('Mihomo 语言服务加载失败，已切换到基础 YAML 编辑模式')
        }
      })

    return () => {
      active = false
    }
  }, [selectedId, yamlLanguageService])

  // 使用结构化操作响应更新对应配置，避免重复文案和跨配置响应污染状态。
  useEffect(() => {
    if (!actionData) return

    if ('error' in actionData) {
      if (actionData.intent !== 'create' || !showCreateForm) {
        notify.error(actionData.error)
      }
      return
    }

    notify.success(actionData.success)

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

  const selectConfig = (config: Config) => {
    setSelectedId(config.id)
    setSelectedRevision(config.revision)
    setEditorContent(config.content)
    setLastSavedContent(config.content)
    setValidationIssues(null)
  }

  const handleEditorValidation = (markers: editor.IMarker[]) => {
    setValidationIssues(
      markers.reduce<ValidationIssues>(
        (issues, marker) => {
          if (marker.severity === MONACO_MARKER_ERROR) issues.errors += 1
          if (marker.severity === MONACO_MARKER_WARNING) issues.warnings += 1
          return issues
        },
        { errors: 0, warnings: 0 },
      ),
    )
  }

  const handleConfigSelect = (config: Config) => {
    if (isMutating) return
    if (hasUnsavedChanges) {
      setPendingSelection(config)
      return
    }
    selectConfig(config)
  }

  const returnToList = () => {
    if (hasUnsavedChanges) {
      setPendingListReturn(true)
      return
    }
    setSelectedId(null)
  }

  const copyApiUrl = async (configId: string) => {
    const url = `${window.location.origin}/api/v1/config/${configId}?token=YOUR_TOKEN`
    try {
      await navigator.clipboard.writeText(url)
      notify.copied()
    } catch {
      notify.error('复制失败，请检查浏览器权限')
    }
  }

  return (
    <Layout fluid>
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col md:min-h-dvh">
        <header className="flex min-h-24 items-center justify-between gap-4 border-b border-gray-200 px-4 sm:px-6 md:px-8 dark:border-gray-800">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">工作区</p>
            <h1 className="text-xl font-semibold tracking-[-0.02em]">配置</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">管理 YAML 配置文件</p>
          </div>
          <Button disabled={isMutating} onClick={() => setShowCreateForm(true)}>
            <IconPlus size={16} />
            新建配置
          </Button>
        </header>

        <ResponsiveDialog
          open={showCreateForm}
          onOpenChange={(open) => {
            if (!open && !isMutating) {
              setShowCreateForm(false)
              setNewConfigId('')
            }
          }}
          title="新建配置"
          description="创建空配置后，可在编辑器中填写 YAML 内容。"
        >
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
              autoFocus
              required
            />

            {showCreateForm &&
              actionData &&
              'error' in actionData &&
              actionData.intent === 'create' && (
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
                onClick={() => {
                  setShowCreateForm(false)
                  setNewConfigId('')
                }}
              >
                取消
              </Button>
              <Button type="submit" disabled={isMutating}>
                {pendingIntent === 'create' ? '创建中…' : '创建配置'}
              </Button>
            </DialogFooter>
          </Form>
        </ResponsiveDialog>

        <div className="grid flex-1 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${selectedId ? 'hidden md:block' : 'block'} border-r border-gray-200 dark:border-gray-800`}>
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-5 dark:border-gray-800">
              <h2 className="text-sm font-semibold">全部配置 <span className="ml-1 font-normal text-gray-500">{configs.length}</span></h2>
            </div>
            {configs.length === 0 ? (
              <div className="px-5 py-10 text-sm text-gray-500">暂无配置</div>
            ) : (
              <List>
                {configs.map((config) => (
                  <ListItem key={config.id} selected={selectedId === config.id}>
                    <ListContent
                      title={config.id}
                      description={new Date(config.updatedAt).toLocaleDateString('zh-CN')}
                      onSelect={() => handleConfigSelect(config)}
                      actions={<>
                        <Button size="sm" variant="secondary" onClick={() => copyApiUrl(config.id)} title="复制 API URL" aria-label={`复制 ${config.id} 的 API URL`}><IconCopy size={14} /></Button>
                        <Button size="sm" variant="danger" type="button" disabled={isMutating} onClick={() => setDeleteTarget(config)} title="删除配置" aria-label={`删除 ${config.id}`}><IconTrash size={14} /></Button>
                      </>}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </aside>

          <section className={`${selectedId ? 'flex' : 'hidden md:flex'} min-w-0 flex-col`}>
            <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-3 py-2 sm:px-5 dark:border-gray-800">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" onClick={returnToList} className="grid size-10 shrink-0 place-items-center rounded-[10px] hover:bg-gray-100 md:hidden dark:hover:bg-gray-900" aria-label="返回配置列表"><IconChevronLeft size={19} /></button>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-medium">{selectedId || '选择配置'}</h2>
                  {selectedId && (
                    <p
                      className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500"
                      aria-live="polite"
                    >
                      <span>{hasUnsavedChanges ? '有未保存的更改' : '已保存'}</span>
                      {yamlLanguageService === 'fallback' && (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                          <IconAlertTriangle size={13} aria-hidden="true" />
                          Mihomo 校验不可用
                        </span>
                      )}
                      {(validationIssues?.errors ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                          <IconCircleX size={13} aria-hidden="true" />
                          {validationIssues?.errors} 个错误
                        </span>
                      )}
                      {(validationIssues?.warnings ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                          <IconAlertTriangle size={13} aria-hidden="true" />
                          {validationIssues?.warnings} 个警告
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {selectedId && selectedRevision !== null && (
                <Form method="post">
                  <input type="hidden" name="action" value="save" />
                  <input type="hidden" name="id" value={selectedId} />
                  <input type="hidden" name="revision" value={selectedRevision} />
                  <input type="hidden" name="content" value={editorContent} />
                  <Button type="submit" disabled={!hasUnsavedChanges || isMutating} variant={hasUnsavedChanges ? 'primary' : 'secondary'}>
                    <IconDeviceFloppy size={16} />
                    {isSaving ? '保存中…' : hasUnsavedChanges ? '保存' : '已保存'}
                  </Button>
                </Form>
              )}
            </div>
            {selectedId ? (
              <div className="min-h-[60dvh] flex-1 overflow-hidden bg-[#1e1e1e] md:min-h-0">
                {yamlLanguageService === 'loading' ? (
                  <div
                    className="flex h-full min-h-[60dvh] items-center justify-center text-sm text-gray-400 md:min-h-0"
                    role="status"
                  >
                    正在加载 Mihomo YAML 语言服务…
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    language="yaml"
                    path={`file:///configs/${encodeURIComponent(selectedId)}.yaml`}
                    saveViewState={false}
                    value={editorContent}
                    onChange={handleEditorChange}
                    onValidate={handleEditorValidation}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', wordWrap: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, insertSpaces: true, detectIndentation: false, readOnly: isMutating, padding: { top: 18, bottom: 18 } }}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-500">从左侧选择一个配置开始编辑</div>
            )}
          </section>
        </div>

        <ConfirmDialog
          open={pendingListReturn}
          onOpenChange={setPendingListReturn}
          title="放弃未保存的更改？"
          description="当前 YAML 修改尚未保存。返回列表后，这些更改将丢失。"
          confirmLabel="放弃并返回"
          onConfirm={() => {
            setSelectedId(null)
            setPendingListReturn(false)
          }}
        />

        <ConfirmDialog
          open={pendingSelection !== null}
          onOpenChange={(open) => {
            if (!open) setPendingSelection(null)
          }}
          title="放弃未保存的更改？"
          description="当前 YAML 修改尚未保存。切换配置后，这些更改将丢失。"
          confirmLabel="放弃并切换"
          onConfirm={() => {
            if (pendingSelection) selectConfig(pendingSelection)
          }}
        />

        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          title="删除 Config？"
          description={
            deleteTarget
              ? `“${deleteTarget.id}” 及其 YAML 内容将被永久删除，此操作无法撤销。`
              : ''
          }
          confirmLabel="删除 Config"
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
