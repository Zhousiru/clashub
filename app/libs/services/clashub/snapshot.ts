import type { StoreService } from '~/libs/services/store'
import type { Config, Fetcher, ProxyProvider } from '~/types'

export interface ClashubSnapshot {
  configs: Config[]
  proxyProviders: ProxyProvider[]
  fetchers: Fetcher[]
}

export async function getClashubSnapshot(
  store: StoreService,
): Promise<ClashubSnapshot> {
  const [configs, proxyProviders, fetchers] = await Promise.all([
    store.getConfigs(),
    store.getProxyProviders(),
    store.getFetchers(),
  ])
  return { configs, proxyProviders, fetchers }
}
