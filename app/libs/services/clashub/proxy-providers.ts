import type { StoreService } from '~/libs/services/store'
import type { ProxyProvider } from '~/types'
import {
  normalizeResourceId,
  requireRevision,
  requireUrl,
} from './validation'

export class ProxyProvidersService {
  constructor(private readonly store: StoreService) {}

  list(): Promise<ProxyProvider[]> {
    return this.store.getProxyProviders()
  }

  get(id: unknown): Promise<ProxyProvider | null> {
    return this.store.getProxyProvider(normalizeResourceId(id))
  }

  create(id: unknown, subscriptionUrl: unknown): Promise<ProxyProvider> {
    return this.store.createProxyProvider(
      normalizeResourceId(id),
      requireUrl(subscriptionUrl, 'subscriptionUrl'),
    )
  }

  update(
    id: unknown,
    subscriptionUrl: unknown,
    expectedRevision: unknown,
  ): Promise<ProxyProvider> {
    return this.store.updateProxyProvider(
      normalizeResourceId(id),
      requireUrl(subscriptionUrl, 'subscriptionUrl'),
      requireRevision(expectedRevision),
    )
  }

  delete(id: unknown, expectedRevision: unknown): Promise<void> {
    return this.store.deleteProxyProvider(
      normalizeResourceId(id),
      requireRevision(expectedRevision),
    )
  }
}
