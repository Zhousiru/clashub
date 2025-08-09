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

    // 发起简单的 GET 请求，获取文本内容
    const response = await fetch(fetcher.url)

    // 获取文本内容
    const text = await response.text()

    // 直接返回文本，设置为 text/plain 类型
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      throw error
    }

    console.error(`Fetcher API Error [${fetcherId}]:`, error)

    throw new Response(
      `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }
    )
  }
}
