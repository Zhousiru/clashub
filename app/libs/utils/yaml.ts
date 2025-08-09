import * as yaml from 'js-yaml'
import type { ClashConfig } from '~/types'

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
      quotingType: '"',
      forceQuotes: false,
    })
  } catch (error) {
    throw new Error(
      `YAML 序列化失败: ${error instanceof Error ? error.message : '未知错误'}`
    )
  }
}

/**
 * 从 Clash 配置中提取 proxies 块
 */
export function extractProxiesFromClash(yamlContent: string): string {
  try {
    const config = parseYaml(yamlContent) as ClashConfig

    if (!config || typeof config !== 'object') {
      throw new Error('无效的 YAML 配置')
    }

    if (!config.proxies || !Array.isArray(config.proxies)) {
      throw new Error('配置中未找到有效的 proxies 块')
    }

    // 返回只包含 proxies 的新配置
    const result = {
      proxies: config.proxies,
    }

    return stringifyYaml(result)
  } catch (error) {
    throw new Error(
      `提取 proxies 失败: ${error instanceof Error ? error.message : '未知错误'}`
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
