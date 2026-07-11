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
import type { Route } from './+types/api.v1.admin.$resource'

export async function loader({ request, context, params }: Route.LoaderArgs) {
  await requireAdminApiAuth(request, context)
  if (!isAdminResource(params.resource)) {
    return apiJson({ error: 'Resource not found' }, 404)
  }

  const store = getStoreService(context)
  try {
    switch (params.resource) {
      case 'configs':
        return apiJson({ values: await new ConfigsService(store).list() })
      case 'proxy-providers':
        return apiJson({
          values: await new ProxyProvidersService(store).list(),
        })
      case 'fetchers':
        return apiJson({ values: await new FetchersService(store).list() })
    }
  } catch (error) {
    return adminApiError(error)
  }
}

export async function action({ request, context, params }: Route.ActionArgs) {
  await requireAdminApiAuth(request, context)
  if (!isAdminResource(params.resource)) {
    return apiJson({ error: 'Resource not found' }, 404)
  }
  if (request.method !== 'POST') return methodNotAllowed(['GET', 'POST'])

  try {
    const body = await readJsonObject(request)
    const store = getStoreService(context)
    switch (params.resource) {
      case 'configs':
        return apiJson(
          {
            value: await new ConfigsService(store).create(
              body.id,
              body.content ?? '',
            ),
          },
          201,
        )
      case 'proxy-providers':
        return apiJson(
          {
            value: await new ProxyProvidersService(store).create(
              body.id,
              body.subscriptionUrl,
              body.renamePattern,
              body.renameReplacement,
            ),
          },
          201,
        )
      case 'fetchers':
        return apiJson(
          {
            value: await new FetchersService(store).create(body.id, body.url),
          },
          201,
        )
    }
  } catch (error) {
    return adminApiError(error)
  }
}
