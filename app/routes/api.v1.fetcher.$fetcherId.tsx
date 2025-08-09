import { getKVService } from '~/libs/services/kv'
import { requireApiAuth } from '~/libs/utils/auth'
import type { Route } from './+types/api.v1.fetcher.$fetcherId'

export async function loader({ request, context, params }: Route.LoaderArgs) {
  // 验证 API 认证
  await requireApiAuth(request, context)

  const fetcherId = params.fetcherId
  if (!fetcherId) {
    throw new Response('Fetcher ID is required', { status: 400 })
  }

  try {
    const kvService = getKVService(context)

    // 获取 Fetcher 配置
    const fetcher = await kvService.getFetcher(fetcherId)
    if (!fetcher) {
      throw new Response(`Fetcher "${fetcherId}" not found`, { status: 404 })
    }

    // 解析原始请求的 URL 以获取查询参数和路径
    const originalUrl = new URL(request.url)
    const targetUrl = new URL(fetcher.url)

    // 将原始请求的查询参数（除了 token）添加到目标 URL
    for (const [key, value] of originalUrl.searchParams) {
      if (key !== 'token') {
        targetUrl.searchParams.set(key, value)
      }
    }

    // 创建代理请求
    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'User-Agent': 'Clashub-Fetcher/1.0',
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || 'unknown',
        'X-Real-IP': request.headers.get('CF-Connecting-IP') || 'unknown',
      },
      body:
        request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : undefined,
    })

    // 发起代理请求
    const response = await fetch(proxyRequest)

    // 创建响应，保持原始响应的大部分头部
    const responseHeaders = new Headers()

    // 复制安全的响应头
    const allowedHeaders = [
      'content-type',
      'content-length',
      'content-encoding',
      'content-disposition',
      'cache-control',
      'expires',
      'last-modified',
      'etag',
    ]

    for (const header of allowedHeaders) {
      const value = response.headers.get(header)
      if (value) {
        responseHeaders.set(header, value)
      }
    }

    // 添加自定义头部
    responseHeaders.set('X-Fetcher-Id', fetcherId)
    responseHeaders.set('X-Target-Url', fetcher.url)
    responseHeaders.set('X-Proxy-Status', response.status.toString())

    // 如果响应不成功，添加错误信息
    if (!response.ok) {
      responseHeaders.set(
        'X-Proxy-Error',
        `Target server returned ${response.status}`
      )
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    if (error instanceof Response) {
      throw error
    }

    console.error(`Fetcher API Error [${fetcherId}]:`, error)

    // 如果是网络错误，返回 502
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Response('Bad Gateway: Failed to connect to target server', {
        status: 502,
        headers: {
          'X-Fetcher-Id': fetcherId,
          'X-Error': 'Connection failed',
        },
      })
    }

    throw new Response(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        status: 500,
        headers: {
          'X-Fetcher-Id': fetcherId,
          'X-Error': 'Internal error',
        },
      }
    )
  }
}

// 支持所有 HTTP 方法的代理
export async function action({ request, context, params }: Route.ActionArgs) {
  return loader({ request, context, params })
}
