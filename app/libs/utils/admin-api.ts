import { StoreError } from '~/libs/services/store'
import { ValidationError } from '~/types'

export type AdminResource = 'configs' | 'proxy-providers' | 'fetchers'

export function isAdminResource(value: string | undefined): value is AdminResource {
  return (
    value === 'configs' ||
    value === 'proxy-providers' ||
    value === 'fetchers'
  )
}

export function apiJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const value = await request.json()
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Body must be an object')
    }
    return value as Record<string, unknown>
  } catch {
    throw apiJson({ error: 'Request body must be a JSON object' }, 400)
  }
}

export function methodNotAllowed(allowed: string[]): Response {
  const response = apiJson({ error: 'Method not allowed' }, 405)
  response.headers.set('Allow', allowed.join(', '))
  return response
}

export function adminApiError(error: unknown): Response {
  if (error instanceof Response) return error

  if (error instanceof StoreError) {
    if (error.details && typeof error.details === 'object') {
      return apiJson(error.details, error.status)
    }
    return apiJson({ error: error.message }, error.status)
  }

  if (error instanceof ValidationError) {
    return apiJson({ error: error.message }, 400)
  }

  console.error('Admin API error:', error)
  return apiJson({ error: 'Internal server error' }, 500)
}
