import { AuthError } from '~/types'
import type { KVService } from './kv'

/**
 * 认证服务类
 */
export class AuthService {
  private kvService: KVService

  constructor(kvService: KVService) {
    this.kvService = kvService
  }

  /**
   * 验证用户 token
   */
  async verifyToken(token: string): Promise<boolean> {
    if (!token || typeof token !== 'string') {
      return false
    }

    try {
      return await this.kvService.verifyToken(token)
    } catch {
      return false
    }
  }

  /**
   * 设置新的 token
   */
  async setToken(token: string): Promise<void> {
    if (!token || typeof token !== 'string' || token.length < 6) {
      throw new AuthError('Token 必须至少包含 6 个字符')
    }

    await this.kvService.setAuthToken(token)
  }

  /**
   * 检查是否已设置 token
   */
  async hasToken(): Promise<boolean> {
    return await this.kvService.hasAuthToken()
  }

  /**
   * 更改 token
   */
  async changeToken(currentToken: string, newToken: string): Promise<void> {
    // 验证当前 token
    const isValid = await this.verifyToken(currentToken)
    if (!isValid) {
      throw new AuthError('当前密码不正确')
    }

    // 设置新 token
    await this.setToken(newToken)
  }

  /**
   * 初次设置 token
   */
  async initializeToken(token: string): Promise<void> {
    const hasToken = await this.hasToken()
    if (hasToken) {
      throw new AuthError('Token 已经设置过了')
    }

    await this.setToken(token)
  }
}

/**
 * 从 cookie 中提取 token
 */
export function extractTokenFromCookie(cookie: string | null): string | null {
  if (!cookie) return null

  const cookies = cookie.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    },
    {} as Record<string, string>
  )

  return cookies.token || null
}

/**
 * 从 query 参数中提取 token
 */
export function extractTokenFromQuery(
  searchParams: URLSearchParams
): string | null {
  return searchParams.get('token')
}

/**
 * 生成 token cookie
 */
export function generateTokenCookie(
  token: string,
  maxAge: number = 60 * 60 * 24 * 30
): string {
  return `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict`
}

/**
 * 生成清除 token cookie
 */
export function generateClearTokenCookie(): string {
  return 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
}
