import type { RouterContextProvider } from 'react-router'
import { cloudflareContext } from '~/context'
import type { Config, Fetcher, ProxyProvider } from '~/types'

interface ValueResponse<T> {
  value: T
}

interface ValuesResponse<T> {
  values: T[]
}

interface ErrorResponse {
  error?: string
}

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'StoreError'
  }
}

export class StoreService {
  constructor(private readonly stub: DurableObjectStub) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.stub.fetch(`https://clashub-store${path}`, init)
    const data = (await response.json()) as T & ErrorResponse
    if (!response.ok) {
      throw new StoreError(
        data.error || `Store request failed`,
        response.status,
        data,
      )
    }
    return data
  }

  private json(method: string, body: unknown): RequestInit {
    return {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  }

  async hasAuthToken(): Promise<boolean> {
    const result = await this.request<{ hasToken: boolean }>('/auth/status')
    return result.hasToken
  }

  async verifyToken(token: string): Promise<boolean> {
    const result = await this.request<{ valid: boolean }>(
      '/auth/verify',
      this.json('POST', { token }),
    )
    return result.valid
  }

  async initializeToken(token: string): Promise<void> {
    await this.request('/auth/initialize', this.json('POST', { token }))
  }

  async changeToken(currentToken: string, newToken: string): Promise<void> {
    await this.request(
      '/auth/change',
      this.json('PUT', { currentToken, newToken }),
    )
  }

  async getConfigs(): Promise<Config[]> {
    return (await this.request<ValuesResponse<Config>>('/configs')).values
  }

  async getConfig(id: string): Promise<Config | null> {
    return this.getOne<Config>(`/configs/${encodeURIComponent(id)}`)
  }

  async createConfig(id: string, content = ''): Promise<Config> {
    return (
      await this.request<ValueResponse<Config>>(
        `/configs/${encodeURIComponent(id)}`,
        this.json('POST', { content }),
      )
    ).value
  }

  async saveConfig(
    id: string,
    content: string,
    expectedRevision: number,
  ): Promise<Config> {
    return (
      await this.request<ValueResponse<Config>>(
        `/configs/${encodeURIComponent(id)}`,
        this.json('PUT', { content, expectedRevision }),
      )
    ).value
  }

  async deleteConfig(id: string, expectedRevision: number): Promise<void> {
    await this.deleteOne(`/configs/${encodeURIComponent(id)}`, expectedRevision)
  }

  async getProxyProviders(): Promise<ProxyProvider[]> {
    return (
      await this.request<ValuesResponse<ProxyProvider>>('/proxy-providers')
    ).values
  }

  async getProxyProvider(id: string): Promise<ProxyProvider | null> {
    return this.getOne<ProxyProvider>(
      `/proxy-providers/${encodeURIComponent(id)}`,
    )
  }

  async createProxyProvider(
    id: string,
    subscriptionUrl: string,
  ): Promise<ProxyProvider> {
    return (
      await this.request<ValueResponse<ProxyProvider>>(
        `/proxy-providers/${encodeURIComponent(id)}`,
        this.json('POST', { subscriptionUrl }),
      )
    ).value
  }

  async updateProxyProvider(
    id: string,
    subscriptionUrl: string,
    expectedRevision: number,
  ): Promise<ProxyProvider> {
    return (
      await this.request<ValueResponse<ProxyProvider>>(
        `/proxy-providers/${encodeURIComponent(id)}`,
        this.json('PUT', { subscriptionUrl, expectedRevision }),
      )
    ).value
  }

  async deleteProxyProvider(
    id: string,
    expectedRevision: number,
  ): Promise<void> {
    await this.deleteOne(
      `/proxy-providers/${encodeURIComponent(id)}`,
      expectedRevision,
    )
  }

  async getFetchers(): Promise<Fetcher[]> {
    return (await this.request<ValuesResponse<Fetcher>>('/fetchers')).values
  }

  async getFetcher(id: string): Promise<Fetcher | null> {
    return this.getOne<Fetcher>(`/fetchers/${encodeURIComponent(id)}`)
  }

  async createFetcher(id: string, url: string): Promise<Fetcher> {
    return (
      await this.request<ValueResponse<Fetcher>>(
        `/fetchers/${encodeURIComponent(id)}`,
        this.json('POST', { url }),
      )
    ).value
  }

  async updateFetcher(
    id: string,
    url: string,
    expectedRevision: number,
  ): Promise<Fetcher> {
    return (
      await this.request<ValueResponse<Fetcher>>(
        `/fetchers/${encodeURIComponent(id)}`,
        this.json('PUT', { url, expectedRevision }),
      )
    ).value
  }

  async deleteFetcher(id: string, expectedRevision: number): Promise<void> {
    await this.deleteOne(
      `/fetchers/${encodeURIComponent(id)}`,
      expectedRevision,
    )
  }

  private async getOne<T>(path: string): Promise<T | null> {
    try {
      return (await this.request<ValueResponse<T>>(path)).value
    } catch (error) {
      if (error instanceof StoreError && error.status === 404) return null
      throw error
    }
  }

  private async deleteOne(path: string, expectedRevision: number) {
    await this.request(path, this.json('DELETE', { expectedRevision }))
  }
}

export function getStoreService(
  context: Pick<RouterContextProvider, 'get'>,
): StoreService {
  const namespace = context.get(cloudflareContext).env.STORE
  if (!namespace) throw new Error('STORE Durable Object binding not found')
  return new StoreService(namespace.get(namespace.idFromName('global')))
}
