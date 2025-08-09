import { getKVService } from '~/libs/services/kv'
import { requireApiAuth } from '~/libs/utils/auth'
import { extractProxiesFromClash } from '~/libs/utils/yaml'
import type { Route } from './+types/api.v1.proxy-provider.$sourceId'

export async function loader({ request, context, params }: Route.LoaderArgs) {
  // 验证 API 认证
  await requireApiAuth(request, context)

  const sourceId = params.sourceId
  if (!sourceId) {
    throw new Response('Source ID is required', { status: 400 })
  }

  try {
    const kvService = getKVService(context)

    // 获取 Proxy Provider 配置
    const provider = await kvService.getProxyProvider(sourceId)
    if (!provider) {
      throw new Response(`Proxy Provider "${sourceId}" not found`, {
        status: 404,
      })
    }

    // 获取订阅链接的内容
    const response = await fetch(provider.subscriptionUrl, {
      headers: {
        'User-Agent': 'Clashub/1.0',
      },
    })

    if (!response.ok) {
      throw new Response(
        `Failed to fetch subscription: ${response.status} ${response.statusText}`,
        { status: 502 }
      )
    }

    const yamlContent = await response.text()

    // 提取 proxies 块
    const proxiesYaml = extractProxiesFromClash(yamlContent)

    // 返回处理后的内容
    return new Response(proxiesYaml, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 缓存 5 分钟
        'X-Source-Id': sourceId,
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      throw error
    }

    console.error(`API Error [${sourceId}]:`, error)

    throw new Response(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    )
  }
}

// 不支持其他 HTTP 方法
export async function action() {
  throw new Response('Method not allowed', { status: 405 })
}
