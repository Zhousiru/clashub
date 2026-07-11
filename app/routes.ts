import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  // 首页重定向到 proxy-providers
  index('routes/index.tsx'),

  // 认证
  route('login', 'routes/login.tsx'),
  route('logout', 'routes/logout.tsx'),

  // 主要功能页面
  route('proxy-providers', 'routes/proxy-providers.tsx'),
  route('configs', 'routes/configs.tsx'),
  route('fetchers', 'routes/fetchers.tsx'),
  route('settings', 'routes/settings.tsx'),

  // API 端点
  route(
    'api/v1/proxy-provider/:sourceId',
    'routes/api.v1.proxy-provider.$sourceId.tsx'
  ),
  route('api/v1/config/:configId', 'routes/api.v1.config.$configId.tsx'),
  route('api/v1/fetcher/:fetcherId', 'routes/api.v1.fetcher.$fetcherId.tsx'),

  // JSON 管理 API（供自动化和 Skill 使用）
  route('api/v1/admin/snapshot', 'routes/api.v1.admin.snapshot.tsx'),
  route('api/v1/admin/:resource', 'routes/api.v1.admin.$resource.tsx'),
  route(
    'api/v1/admin/:resource/:resourceId',
    'routes/api.v1.admin.$resource.$resourceId.tsx',
  ),
] satisfies RouteConfig
