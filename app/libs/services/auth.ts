import { AuthError } from '~/types'
import { StoreError, type StoreService } from './store'

/**
 * 认证服务类
 */
export class AuthService {
  constructor(private readonly store: StoreService) {}

  /**
   * 验证用户 token
   */
  async verifyToken(token: string): Promise<boolean> {
    if (!token || typeof token !== 'string') {
      return false
    }

    try {
      return await this.store.verifyToken(token)
    } catch {
      return false
    }
  }

  /**
   * 设置新的 token
   */
  private validateToken(token: string): void {
    if (!token || typeof token !== 'string' || token.length < 6) {
      throw new AuthError('Token 必须至少包含 6 个字符')
    }
  }

  /**
   * 检查是否已设置 token
   */
  async hasToken(): Promise<boolean> {
    return await this.store.hasAuthToken()
  }

  /**
   * 更改 token
   */
  async changeToken(currentToken: string, newToken: string): Promise<void> {
    this.validateToken(newToken)
    try {
      await this.store.changeToken(currentToken, newToken)
    } catch (error) {
      if (error instanceof StoreError && error.status === 403) {
        throw new AuthError('当前密码不正确')
      }
      throw error
    }
  }

  /**
   * 初次设置 token
   */
  async initializeToken(token: string): Promise<void> {
    this.validateToken(token)
    try {
      await this.store.initializeToken(token)
    } catch (error) {
      if (error instanceof StoreError && error.status === 409) {
        throw new AuthError('Token 已经设置过了')
      }
      throw error
    }
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
    {} as Record<string, string>,
  )

  return cookies.token || null
}

/**
 * 从 query 参数中提取 token
 */
export function extractTokenFromQuery(
  searchParams: URLSearchParams,
): string | null {
  return searchParams.get('token')
}

/**
 * 生成 token cookie
 */
export function generateTokenCookie(
  token: string,
  maxAge: number = 60 * 60 * 24 * 30,
): string {
  return `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict`
}

/**
 * 生成清除 token cookie
 */
export function generateClearTokenCookie(): string {
  return 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
}
