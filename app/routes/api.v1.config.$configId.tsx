import { getKVService } from '~/libs/services/kv'
import { requireApiAuth } from '~/libs/utils/auth'
import type { Route } from './+types/api.v1.config.$configId'

export async function loader({ request, context, params }: Route.LoaderArgs) {
  // 验证 API 认证
  await requireApiAuth(request, context)

  const configId = params.configId
  if (!configId) {
    throw new Response('Config ID is required', { status: 400 })
  }

  try {
    const kvService = getKVService(context)

    // 获取配置内容
    const config = await kvService.getConfig(configId)
    if (!config) {
      throw new Response(`Config "${configId}" not found`, { status: 404 })
    }

    // 直接返回配置内容
    return new Response(config.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=60', // 缓存 1 分钟
        'X-Config-Id': configId,
        'X-Last-Modified': config.updatedAt,
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      throw error
    }

    console.error(`Config API Error [${configId}]:`, error)

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
