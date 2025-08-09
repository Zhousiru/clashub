import type { AuthToken, Config, Fetcher, ProxyProvider } from '~/types'
import { KVKeys } from '~/types'

/**
 * KV 存储服务类
 */
export class KVService {
  private kv: KVNamespace

  constructor(kv: KVNamespace) {
    this.kv = kv
  }

  // 认证相关
  async getAuthToken(): Promise<string | null> {
    const data = await this.kv.get(KVKeys.AUTH_TOKEN)
    if (!data) return null

    try {
      const authToken: AuthToken = JSON.parse(data)
      return authToken.token
    } catch {
      return null
    }
  }

  async setAuthToken(token: string): Promise<void> {
    const authToken: AuthToken = {
      token,
      createdAt: new Date().toISOString(),
    }
    await this.kv.put(KVKeys.AUTH_TOKEN, JSON.stringify(authToken))
  }

  async hasAuthToken(): Promise<boolean> {
    const token = await this.getAuthToken()
    return token !== null
  }

  async verifyToken(token: string): Promise<boolean> {
    const storedToken = await this.getAuthToken()
    return storedToken === token
  }

  // Proxy Provider 相关
  async getProxyProviders(): Promise<ProxyProvider[]> {
    const data = await this.kv.get(KVKeys.PROXY_PROVIDERS)
    if (!data) return []

    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  async getProxyProvider(id: string): Promise<ProxyProvider | null> {
    const providers = await this.getProxyProviders()
    return providers.find((p) => p.id === id) || null
  }

  async saveProxyProvider(
    provider: Omit<ProxyProvider, 'createdAt' | 'updatedAt'>
  ): Promise<ProxyProvider> {
    const providers = await this.getProxyProviders()
    const existingIndex = providers.findIndex((p) => p.id === provider.id)

    const now = new Date().toISOString()
    const savedProvider: ProxyProvider = {
      ...provider,
      createdAt: existingIndex >= 0 ? providers[existingIndex].createdAt : now,
      updatedAt: now,
    }

    if (existingIndex >= 0) {
      providers[existingIndex] = savedProvider
    } else {
      providers.push(savedProvider)
    }

    await this.kv.put(KVKeys.PROXY_PROVIDERS, JSON.stringify(providers))
    return savedProvider
  }

  async deleteProxyProvider(id: string): Promise<boolean> {
    const providers = await this.getProxyProviders()
    const filteredProviders = providers.filter((p) => p.id !== id)

    if (filteredProviders.length === providers.length) {
      return false // Not found
    }

    await this.kv.put(KVKeys.PROXY_PROVIDERS, JSON.stringify(filteredProviders))
    return true
  }

  // Config 相关
  async getConfigs(): Promise<Config[]> {
    const data = await this.kv.get(KVKeys.CONFIGS)
    if (!data) return []

    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  async getConfig(id: string): Promise<Config | null> {
    const configs = await this.getConfigs()
    return configs.find((c) => c.id === id) || null
  }

  async saveConfig(
    config: Omit<Config, 'createdAt' | 'updatedAt'>
  ): Promise<Config> {
    const configs = await this.getConfigs()
    const existingIndex = configs.findIndex((c) => c.id === config.id)

    const now = new Date().toISOString()
    const savedConfig: Config = {
      ...config,
      createdAt: existingIndex >= 0 ? configs[existingIndex].createdAt : now,
      updatedAt: now,
    }

    if (existingIndex >= 0) {
      configs[existingIndex] = savedConfig
    } else {
      configs.push(savedConfig)
    }

    await this.kv.put(KVKeys.CONFIGS, JSON.stringify(configs))
    return savedConfig
  }

  async deleteConfig(id: string): Promise<boolean> {
    const configs = await this.getConfigs()
    const filteredConfigs = configs.filter((c) => c.id !== id)

    if (filteredConfigs.length === configs.length) {
      return false // Not found
    }

    await this.kv.put(KVKeys.CONFIGS, JSON.stringify(filteredConfigs))
    return true
  }

  // Fetcher 相关
  async getFetchers(): Promise<Fetcher[]> {
    const data = await this.kv.get(KVKeys.FETCHERS)
    if (!data) return []

    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  async getFetcher(id: string): Promise<Fetcher | null> {
    const fetchers = await this.getFetchers()
    return fetchers.find((f) => f.id === id) || null
  }

  async saveFetcher(
    fetcher: Omit<Fetcher, 'createdAt' | 'updatedAt'>
  ): Promise<Fetcher> {
    const fetchers = await this.getFetchers()
    const existingIndex = fetchers.findIndex((f) => f.id === fetcher.id)

    const now = new Date().toISOString()
    const savedFetcher: Fetcher = {
      ...fetcher,
      createdAt: existingIndex >= 0 ? fetchers[existingIndex].createdAt : now,
      updatedAt: now,
    }

    if (existingIndex >= 0) {
      fetchers[existingIndex] = savedFetcher
    } else {
      fetchers.push(savedFetcher)
    }

    await this.kv.put(KVKeys.FETCHERS, JSON.stringify(fetchers))
    return savedFetcher
  }

  async deleteFetcher(id: string): Promise<boolean> {
    const fetchers = await this.getFetchers()
    const filteredFetchers = fetchers.filter((f) => f.id !== id)

    if (filteredFetchers.length === fetchers.length) {
      return false // Not found
    }

    await this.kv.put(KVKeys.FETCHERS, JSON.stringify(filteredFetchers))
    return true
  }
}

/**
 * 获取 KV 服务实例
 */
export function getKVService(context: any): KVService {
  const kv = context.cloudflare.env.KV
  if (!kv) {
    throw new Error('KV namespace not found')
  }
  return new KVService(kv)
}
