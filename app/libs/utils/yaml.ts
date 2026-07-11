import * as yaml from 'js-yaml'

/**
 * 解析 YAML 字符串
 */
export function parseYaml(yamlString: string): any {
  try {
    return yaml.load(yamlString)
  } catch (error) {
    throw new Error(
      `YAML 解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    )
  }
}

/**
 * 将对象转换为 YAML 字符串
 */
export function stringifyYaml(data: any): string {
  try {
    return yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      quoteStyle: 'double',
      forceQuotes: false,
    })
  } catch (error) {
    throw new Error(
      `YAML 序列化失败: ${error instanceof Error ? error.message : '未知错误'}`
    )
  }
}

/**
 * 验证 YAML 格式
 */
export function validateYaml(yamlString: string): {
  isValid: boolean
  error?: string
} {
  try {
    parseYaml(yamlString)
    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

/**
 * 美化 YAML 格式
 */
export function formatYaml(yamlString: string): string {
  try {
    const data = parseYaml(yamlString)
    return stringifyYaml(data)
  } catch (error) {
    throw new Error(
      `YAML 格式化失败: ${error instanceof Error ? error.message : '未知错误'}`
    )
  }
}
