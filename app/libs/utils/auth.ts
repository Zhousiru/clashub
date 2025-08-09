import { redirect } from 'react-router'
import {
  AuthService,
  extractTokenFromCookie,
  extractTokenFromQuery,
} from '~/libs/services/auth'
import { getKVService } from '~/libs/services/kv'

/**
 * 从请求中获取 token（优先从 cookie，其次从 query）
 */
export function getTokenFromRequest(request: Request): string | null {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  // 优先从 query 参数获取（用于 API 调用）
  const queryToken = extractTokenFromQuery(searchParams)
  if (queryToken) return queryToken

  // 从 cookie 获取（用于页面访问）
  const cookie = request.headers.get('Cookie')
  return extractTokenFromCookie(cookie)
}

/**
 * 认证中间件 - 检查用户是否已登录
 */
export async function requireAuth(
  request: Request,
  context: any
): Promise<string> {
  const kvService = getKVService(context)
  const authService = new AuthService(kvService)

  // 检查是否有设置过 token
  const hasToken = await authService.hasToken()
  if (!hasToken) {
    throw redirect('/login?setup=true')
  }

  // 获取当前请求的 token
  const token = getTokenFromRequest(request)
  if (!token) {
    throw redirect('/login')
  }

  // 验证 token
  const isValid = await authService.verifyToken(token)
  if (!isValid) {
    throw redirect('/login?error=invalid')
  }

  return token
}

/**
 * 可选认证 - 不强制要求登录，但返回认证状态
 */
export async function optionalAuth(
  request: Request,
  context: any
): Promise<{
  isAuthenticated: boolean
  token: string | null
  needsSetup: boolean
}> {
  try {
    const kvService = getKVService(context)
    const authService = new AuthService(kvService)

    // 检查是否有设置过 token
    const hasToken = await authService.hasToken()
    if (!hasToken) {
      return {
        isAuthenticated: false,
        token: null,
        needsSetup: true,
      }
    }

    // 获取当前请求的 token
    const token = getTokenFromRequest(request)
    if (!token) {
      return {
        isAuthenticated: false,
        token: null,
        needsSetup: false,
      }
    }

    // 验证 token
    const isValid = await authService.verifyToken(token)
    return {
      isAuthenticated: isValid,
      token: isValid ? token : null,
      needsSetup: false,
    }
  } catch {
    return {
      isAuthenticated: false,
      token: null,
      needsSetup: false,
    }
  }
}

/**
 * API 认证中间件 - 专门用于 API 端点
 */
export async function requireApiAuth(
  request: Request,
  context: any
): Promise<string> {
  const kvService = getKVService(context)
  const authService = new AuthService(kvService)

  // 获取 token（API 调用必须通过 query 参数）
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    throw new Response('Unauthorized: Missing token', { status: 401 })
  }

  // 验证 token
  const isValid = await authService.verifyToken(token)
  if (!isValid) {
    throw new Response('Unauthorized: Invalid token', { status: 401 })
  }

  return token
}

/**
 * 检查是否需要初始设置
 */
export async function checkSetupRequired(context: any): Promise<boolean> {
  try {
    const kvService = getKVService(context)
    const authService = new AuthService(kvService)
    return !(await authService.hasToken())
  } catch {
    return true
  }
}
