import type { StoreService } from '~/libs/services/store'
import type { Fetcher } from '~/types'
import {
  normalizeResourceId,
  requireRevision,
  requireUrl,
} from './validation'

export class FetchersService {
  constructor(private readonly store: StoreService) {}

  list(): Promise<Fetcher[]> {
    return this.store.getFetchers()
  }

  get(id: unknown): Promise<Fetcher | null> {
    return this.store.getFetcher(normalizeResourceId(id))
  }

  create(id: unknown, url: unknown): Promise<Fetcher> {
    return this.store.createFetcher(
      normalizeResourceId(id),
      requireUrl(url, 'url'),
    )
  }

  update(
    id: unknown,
    url: unknown,
    expectedRevision: unknown,
  ): Promise<Fetcher> {
    return this.store.updateFetcher(
      normalizeResourceId(id),
      requireUrl(url, 'url'),
      requireRevision(expectedRevision),
    )
  }

  delete(id: unknown, expectedRevision: unknown): Promise<void> {
    return this.store.deleteFetcher(
      normalizeResourceId(id),
      requireRevision(expectedRevision),
    )
  }
}
