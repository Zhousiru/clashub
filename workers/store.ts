import type { AuthToken, Config, Fetcher, ProxyProvider } from '../app/types'

const AUTH_KEY = 'auth:token'
const CONFIG_PREFIX = 'config:'
const PROVIDER_PREFIX = 'proxy-provider:'
const FETCHER_PREFIX = 'fetcher:'

interface VersionedRecord {
  id: string
  revision: number
  createdAt: string
  updatedAt: string
}

type UpdateResult<T> =
  | { status: 'saved'; value: T }
  | { status: 'missing' }
  | { status: 'conflict'; value: T }

type DeleteResult = 'deleted' | 'missing' | 'conflict'

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

function resourceId(path: string, prefix: string) {
  return path.startsWith(prefix)
    ? decodeURIComponent(path.slice(prefix.length))
    : null
}

export class ClashubStore implements DurableObject {
  constructor(private readonly state: DurableObjectState) {}

  private async list<T>(prefix: string): Promise<T[]> {
    const entries = await this.state.storage.list<T>({ prefix })
    return [...entries.values()].sort((a, b) => {
      const left = (a as { id: string }).id
      const right = (b as { id: string }).id
      return left.localeCompare(right)
    })
  }

  private async create<T extends VersionedRecord>(
    key: string,
    value: T,
  ): Promise<boolean> {
    return this.state.storage.transaction(async (txn) => {
      if (await txn.get(key)) return false
      await txn.put(key, value)
      return true
    })
  }

  private async update<T extends VersionedRecord>(
    key: string,
    expectedRevision: number,
    changes: Partial<T>,
  ): Promise<UpdateResult<T>> {
    return this.state.storage.transaction(async (txn) => {
      const existing = await txn.get<T>(key)
      if (!existing) return { status: 'missing' }
      if (existing.revision !== expectedRevision) {
        return { status: 'conflict', value: existing }
      }

      const value = {
        ...existing,
        ...changes,
        id: existing.id,
        revision: existing.revision + 1,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      } as T
      await txn.put(key, value)
      return { status: 'saved', value }
    })
  }

  private async delete(
    key: string,
    expectedRevision: number,
  ): Promise<DeleteResult> {
    return this.state.storage.transaction(async (txn) => {
      const existing = await txn.get<VersionedRecord>(key)
      if (!existing) return 'missing'
      if (existing.revision !== expectedRevision) return 'conflict'
      await txn.delete(key)
      return 'deleted'
    })
  }

  private updateResponse<T>(result: UpdateResult<T>) {
    if (result.status === 'missing') return json({ error: 'Not found' }, 404)
    if (result.status === 'conflict') {
      return json({ error: 'Revision conflict', value: result.value }, 409)
    }
    return json({ value: result.value })
  }

  private deleteResponse(result: DeleteResult) {
    if (result === 'missing') return json({ error: 'Not found' }, 404)
    if (result === 'conflict') return json({ error: 'Revision conflict' }, 409)
    return json({ deleted: true })
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname

    if (path === '/auth/status' && request.method === 'GET') {
      return json({ hasToken: Boolean(await this.state.storage.get(AUTH_KEY)) })
    }

    if (path === '/auth/verify' && request.method === 'POST') {
      const { token } = (await request.json()) as { token: string }
      const stored = await this.state.storage.get<AuthToken>(AUTH_KEY)
      return json({ valid: Boolean(stored && stored.token === token) })
    }

    if (path === '/auth/initialize' && request.method === 'POST') {
      const { token } = (await request.json()) as { token: string }
      const initialized = await this.state.storage.transaction(async (txn) => {
        if (await txn.get(AUTH_KEY)) return false
        await txn.put<AuthToken>(AUTH_KEY, {
          token,
          createdAt: new Date().toISOString(),
        })
        return true
      })
      return initialized
        ? json({ initialized: true }, 201)
        : json({ error: 'Token already initialized' }, 409)
    }

    if (path === '/auth/change' && request.method === 'PUT') {
      const { currentToken, newToken } = (await request.json()) as {
        currentToken: string
        newToken: string
      }
      const changed = await this.state.storage.transaction(async (txn) => {
        const stored = await txn.get<AuthToken>(AUTH_KEY)
        if (!stored || stored.token !== currentToken) return false
        await txn.put<AuthToken>(AUTH_KEY, {
          token: newToken,
          createdAt: stored.createdAt,
        })
        return true
      })
      return changed
        ? json({ changed: true })
        : json({ error: 'Current token is invalid' }, 403)
    }

    if (path === '/configs' && request.method === 'GET') {
      return json({ values: await this.list<Config>(CONFIG_PREFIX) })
    }

    const configId = resourceId(path, '/configs/')
    if (configId) {
      const key = `${CONFIG_PREFIX}${configId}`
      if (request.method === 'GET') {
        const value = await this.state.storage.get<Config>(key)
        return value ? json({ value }) : json({ error: 'Not found' }, 404)
      }
      if (request.method === 'POST') {
        const body = (await request.json()) as { content?: unknown }
        if (body.content !== undefined && typeof body.content !== 'string') {
          return json({ error: 'Invalid request' }, 400)
        }
        const now = new Date().toISOString()
        const value: Config = {
          id: configId,
          content: body.content ?? '',
          revision: 1,
          createdAt: now,
          updatedAt: now,
        }
        return (await this.create(key, value))
          ? json({ value }, 201)
          : json({ error: 'Already exists' }, 409)
      }
      if (request.method === 'PUT') {
        const { content, expectedRevision } = (await request.json()) as {
          content: string
          expectedRevision: number
        }
        if (
          typeof content !== 'string' ||
          !Number.isInteger(expectedRevision)
        ) {
          return json({ error: 'Invalid request' }, 400)
        }
        return this.updateResponse(
          await this.update<Config>(key, expectedRevision, { content }),
        )
      }
      if (request.method === 'DELETE') {
        const { expectedRevision } = (await request.json()) as {
          expectedRevision: number
        }
        return this.deleteResponse(await this.delete(key, expectedRevision))
      }
    }

    if (path === '/proxy-providers' && request.method === 'GET') {
      return json({ values: await this.list<ProxyProvider>(PROVIDER_PREFIX) })
    }

    const providerId = resourceId(path, '/proxy-providers/')
    if (providerId) {
      const key = `${PROVIDER_PREFIX}${providerId}`
      if (request.method === 'GET') {
        const value = await this.state.storage.get<ProxyProvider>(key)
        return value ? json({ value }) : json({ error: 'Not found' }, 404)
      }
      const body = (await request.json()) as {
        subscriptionUrl?: string
        expectedRevision?: number
      }
      if (
        request.method === 'POST' &&
        typeof body.subscriptionUrl === 'string'
      ) {
        const now = new Date().toISOString()
        const value: ProxyProvider = {
          id: providerId,
          subscriptionUrl: body.subscriptionUrl,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        }
        return (await this.create(key, value))
          ? json({ value }, 201)
          : json({ error: 'Already exists' }, 409)
      }
      if (
        request.method === 'PUT' &&
        typeof body.subscriptionUrl === 'string' &&
        Number.isInteger(body.expectedRevision)
      ) {
        return this.updateResponse(
          await this.update<ProxyProvider>(key, body.expectedRevision!, {
            subscriptionUrl: body.subscriptionUrl,
          }),
        )
      }
      if (
        request.method === 'DELETE' &&
        Number.isInteger(body.expectedRevision)
      ) {
        return this.deleteResponse(
          await this.delete(key, body.expectedRevision!),
        )
      }
      return json({ error: 'Invalid request' }, 400)
    }

    if (path === '/fetchers' && request.method === 'GET') {
      return json({ values: await this.list<Fetcher>(FETCHER_PREFIX) })
    }

    const fetcherId = resourceId(path, '/fetchers/')
    if (fetcherId) {
      const key = `${FETCHER_PREFIX}${fetcherId}`
      if (request.method === 'GET') {
        const value = await this.state.storage.get<Fetcher>(key)
        return value ? json({ value }) : json({ error: 'Not found' }, 404)
      }
      const body = (await request.json()) as {
        url?: string
        expectedRevision?: number
      }
      if (request.method === 'POST' && typeof body.url === 'string') {
        const now = new Date().toISOString()
        const value: Fetcher = {
          id: fetcherId,
          url: body.url,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        }
        return (await this.create(key, value))
          ? json({ value }, 201)
          : json({ error: 'Already exists' }, 409)
      }
      if (
        request.method === 'PUT' &&
        typeof body.url === 'string' &&
        Number.isInteger(body.expectedRevision)
      ) {
        return this.updateResponse(
          await this.update<Fetcher>(key, body.expectedRevision!, {
            url: body.url,
          }),
        )
      }
      if (
        request.method === 'DELETE' &&
        Number.isInteger(body.expectedRevision)
      ) {
        return this.deleteResponse(
          await this.delete(key, body.expectedRevision!),
        )
      }
      return json({ error: 'Invalid request' }, 400)
    }

    return json({ error: 'Not found' }, 404)
  }
}
