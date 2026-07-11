import {
  ConfigsService,
  FetchersService,
  ProxyProvidersService,
} from '~/libs/services/clashub'
import { getStoreService } from '~/libs/services/store'
import {
  adminApiError,
  apiJson,
  isAdminResource,
  methodNotAllowed,
  readJsonObject,
} from '~/libs/utils/admin-api'
import { requireAdminApiAuth } from '~/libs/utils/auth'
import type { Route } from './+types/api.v1.admin.$resource.$resourceId'

async function getResource(
  resource: 'configs' | 'proxy-providers' | 'fetchers',
  id: string,
  context: Route.LoaderArgs['context'],
) {
  const store = getStoreService(context)
  switch (resource) {
    case 'configs':
      return new ConfigsService(store).get(id)
    case 'proxy-providers':
      return new ProxyProvidersService(store).get(id)
    case 'fetchers':
      return new FetchersService(store).get(id)
  }
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  await requireAdminApiAuth(request, context)
  if (!isAdminResource(params.resource) || !params.resourceId) {
    return apiJson({ error: 'Resource not found' }, 404)
  }

  try {
    const value = await getResource(params.resource, params.resourceId, context)
    return value
      ? apiJson({ value })
      : apiJson({ error: 'Resource not found' }, 404)
  } catch (error) {
    return adminApiError(error)
  }
}

export async function action({ request, context, params }: Route.ActionArgs) {
  await requireAdminApiAuth(request, context)
  if (!isAdminResource(params.resource) || !params.resourceId) {
    return apiJson({ error: 'Resource not found' }, 404)
  }
  if (request.method !== 'PUT' && request.method !== 'DELETE') {
    return methodNotAllowed(['GET', 'PUT', 'DELETE'])
  }

  try {
    const body = await readJsonObject(request)
    const store = getStoreService(context)

    if (request.method === 'DELETE') {
      switch (params.resource) {
        case 'configs':
          await new ConfigsService(store).delete(
            params.resourceId,
            body.expectedRevision,
          )
          break
        case 'proxy-providers':
          await new ProxyProvidersService(store).delete(
            params.resourceId,
            body.expectedRevision,
          )
          break
        case 'fetchers':
          await new FetchersService(store).delete(
            params.resourceId,
            body.expectedRevision,
          )
          break
      }
      return apiJson({ deleted: true })
    }

    switch (params.resource) {
      case 'configs':
        return apiJson({
          value: await new ConfigsService(store).update(
            params.resourceId,
            body.content,
            body.expectedRevision,
          ),
        })
      case 'proxy-providers':
        return apiJson({
          value: await new ProxyProvidersService(store).update(
            params.resourceId,
            body.subscriptionUrl,
            body.expectedRevision,
          ),
        })
      case 'fetchers':
        return apiJson({
          value: await new FetchersService(store).update(
            params.resourceId,
            body.url,
            body.expectedRevision,
          ),
        })
    }
  } catch (error) {
    return adminApiError(error)
  }
}
