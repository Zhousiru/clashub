import type { StoreService } from '~/libs/services/store'
import type { Config } from '~/types'
import {
  normalizeResourceId,
  requireRevision,
  requireString,
} from './validation'

export class ConfigsService {
  constructor(private readonly store: StoreService) {}

  list(): Promise<Config[]> {
    return this.store.getConfigs()
  }

  get(id: unknown): Promise<Config | null> {
    return this.store.getConfig(normalizeResourceId(id))
  }

  create(id: unknown, content: unknown = ''): Promise<Config> {
    return this.store.createConfig(
      normalizeResourceId(id),
      requireString(content, 'content'),
    )
  }

  update(
    id: unknown,
    content: unknown,
    expectedRevision: unknown,
  ): Promise<Config> {
    return this.store.saveConfig(
      normalizeResourceId(id),
      requireString(content, 'content'),
      requireRevision(expectedRevision),
    )
  }

  delete(id: unknown, expectedRevision: unknown): Promise<void> {
    return this.store.deleteConfig(
      normalizeResourceId(id),
      requireRevision(expectedRevision),
    )
  }
}
