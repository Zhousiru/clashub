import { sanitizeId, validateUrl } from '~/libs/utils'
import { ValidationError } from '~/types'

export function normalizeResourceId(id: unknown): string {
  if (typeof id !== 'string' || !id.trim()) {
    throw new ValidationError('ID 不能为空')
  }
  return sanitizeId(id.trim())
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} 必须是字符串`)
  }
  return value
}

export function requireUrl(value: unknown, field: string): string {
  const url = requireString(value, field)
  if (!url || !validateUrl(url)) {
    throw new ValidationError(`${field} 必须是有效的 URL`)
  }
  return url
}

export function requireRevision(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new ValidationError('expectedRevision 必须是正整数')
  }
  return value as number
}

export function requireProxyRenameRule(
  pattern: unknown,
  replacement: unknown,
): { renamePattern: string; renameReplacement: string } {
  const renamePattern =
    pattern === undefined ? '' : requireString(pattern, 'renamePattern')
  const renameReplacement =
    replacement === undefined
      ? ''
      : requireString(replacement, 'renameReplacement')

  if (renamePattern.length > 256) {
    throw new ValidationError('renamePattern 不能超过 256 个字符')
  }
  if (renameReplacement.length > 512) {
    throw new ValidationError('renameReplacement 不能超过 512 个字符')
  }

  if (renamePattern) {
    try {
      new RegExp(renamePattern, 'g')
    } catch (error) {
      throw new ValidationError(
        `renamePattern 不是有效的正则表达式: ${
          error instanceof Error ? error.message : '未知错误'
        }`,
      )
    }
  }

  return { renamePattern, renameReplacement }
}
