import { getClashubSnapshot } from '~/libs/services/clashub'
import { getStoreService } from '~/libs/services/store'
import { adminApiError, apiJson, methodNotAllowed } from '~/libs/utils/admin-api'
import { requireAdminApiAuth } from '~/libs/utils/auth'
import type { Route } from './+types/api.v1.admin.snapshot'

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireAdminApiAuth(request, context)

  try {
    return apiJson({ value: await getClashubSnapshot(getStoreService(context)) })
  } catch (error) {
    return adminApiError(error)
  }
}

export async function action() {
  return methodNotAllowed(['GET'])
}
