import { getStoreService } from '~/libs/services/store'
import {
  parseProxySubscription,
  replaceProxyNames,
  SubscriptionFormatError,
} from '~/libs/utils/subscription'
import { requireApiAuth } from '~/libs/utils/auth'
import { stringifyYaml } from '~/libs/utils/yaml'
import type { Route } from './+types/api.v1.proxy-provider.$sourceId'

export async function loader({ request, context, params }: Route.LoaderArgs) {
  // 验证 API 认证
  await requireApiAuth(request, context)

  const sourceId = params.sourceId
  if (!sourceId) {
    throw new Response('Source ID is required', { status: 400 })
  }

  try {
    const store = getStoreService(context)

    // 获取 Proxy Provider 配置
    const provider = await store.getProxyProvider(sourceId)
    if (!provider) {
      throw new Response(`Proxy Provider "${sourceId}" not found`, {
        status: 404,
      })
    }

    // 获取订阅链接的内容
    const response = await fetch(provider.subscriptionUrl, {
      headers: {
        Accept: 'application/yaml, application/json, text/plain, */*',
        'User-Agent': 'clash.meta',
      },
    })

    if (!response.ok) {
      throw new Response(
        `Failed to fetch subscription: ${response.status} ${response.statusText}`,
        { status: 502 },
      )
    }

    const contentLength = Number(response.headers.get('Content-Length'))
    if (Number.isFinite(contentLength) && contentLength > 10 * 1024 * 1024) {
      throw new Response('Subscription content exceeds the 10 MiB limit', {
        status: 502,
      })
    }

    const subscriptionContent = await response.text()
    if (new TextEncoder().encode(subscriptionContent).byteLength > 10 * 1024 * 1024) {
      throw new Response('Subscription content exceeds the 10 MiB limit', {
        status: 502,
      })
    }

    const parsed = parseProxySubscription(subscriptionContent)
    const proxies = replaceProxyNames(
      parsed.proxies,
      provider.renamePattern,
      provider.renameReplacement,
    )
    const proxiesYaml = stringifyYaml({ proxies })

    // 返回处理后的内容
    return new Response(proxiesYaml, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 缓存 5 分钟
        'X-Source-Id': sourceId,
        'X-Subscription-Format': parsed.format,
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      throw error
    }

    if (error instanceof SubscriptionFormatError) {
      throw new Response(`Unsupported subscription: ${error.message}`, {
        status: 502,
      })
    }

    console.error(`API Error [${sourceId}]:`, error)

    throw new Response(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 },
    )
  }
}

// 不支持其他 HTTP 方法
export async function action() {
  throw new Response('Method not allowed', { status: 405 })
}
