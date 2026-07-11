import { loader } from '@monaco-editor/react'
import mihomoSchemaSource from 'meta-json-schema/schemas/meta-json-schema.json?raw'
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { configureMonacoYaml, type JSONSchema } from 'monaco-yaml'
import YamlWorker from '~/workers/yaml.worker?worker'

let configured = false
const mihomoSchema = JSON.parse(mihomoSchemaSource) as JSONSchema

export function initializeMonacoYaml() {
  globalThis.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === 'yaml') return new YamlWorker()
      return new EditorWorker()
    },
  }

  loader.config({ monaco })

  if (configured) return

  configureMonacoYaml(monaco, {
    enableSchemaRequest: false,
    schemas: [
      {
        fileMatch: ['**/*.yaml', '**/*.yml'],
        schema: mihomoSchema,
        uri: 'https://clashub.local/schemas/mihomo-1.19.27.json',
      },
    ],
    yamlVersion: '1.2',
  })

  configured = true
}
