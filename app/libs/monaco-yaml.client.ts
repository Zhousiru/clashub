import { loader } from '@monaco-editor/react'
import mihomoSchemaSource from 'meta-json-schema/schemas/meta-json-schema.json?raw'
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { configureMonacoYaml, type JSONSchema } from 'monaco-yaml'
import YamlWorker from '~/workers/yaml.worker?worker'

let configured = false
const mihomoSchema = JSON.parse(mihomoSchemaSource) as JSONSchema

interface ExternalWorkerOptions {
  createData: unknown
  host?: Record<string, (...args: unknown[]) => unknown>
  keepIdleModels?: boolean
  label?: string
  moduleId: string
}

function installExternalWorkerAdapter() {
  const createInternalWebWorker = monaco.editor.createWebWorker.bind(monaco.editor)

  // editor.api.js exposes Monaco's smaller internal worker API. Language
  // extensions use the external API that editor.main.js normally adapts.
  monaco.editor.createWebWorker = ((
    options:
      | Parameters<typeof createInternalWebWorker>[0]
      | ExternalWorkerOptions,
  ) => {
    if ('worker' in options) return createInternalWebWorker(options)

    const getWorker = globalThis.MonacoEnvironment?.getWorker
    if (!getWorker) throw new Error('MonacoEnvironment.getWorker is required')

    const worker = Promise.resolve(
      getWorker('workerMain.js', options.label ?? 'monaco-editor-worker'),
    ).then((instance) => {
      instance.postMessage('ignore')
      instance.postMessage(options.createData)
      return instance
    })

    return createInternalWebWorker({
      worker,
      host: options.host,
      keepIdleModels: options.keepIdleModels,
    })
  }) as typeof monaco.editor.createWebWorker
}

export function initializeMonacoYaml() {
  globalThis.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === 'yaml') return new YamlWorker()
      return new EditorWorker()
    },
  }

  loader.config({ monaco })

  if (configured) return

  installExternalWorkerAdapter()
  configureMonacoYaml(monaco, {
    enableSchemaRequest: false,
    schemas: [
      {
        fileMatch: ['**/*.yaml', '**/*.yml'],
        schema: mihomoSchema,
        uri: 'inmemory://clashub/schemas/mihomo-1.19.27.json',
      },
    ],
    yamlVersion: '1.2',
  })

  configured = true
}
