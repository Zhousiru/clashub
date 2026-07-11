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
