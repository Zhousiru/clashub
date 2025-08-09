// 应用类型定义

// 认证相关
export interface AuthToken {
  token: string
  createdAt: string
}

// Proxy Provider 相关
export interface ProxyProvider {
  id: string // Source ID - 小写字母、数字、连字符和英文句点组成
  subscriptionUrl: string // Subscription URL
  createdAt: string
  updatedAt: string
}

// Config 相关
export interface Config {
  id: string // Config ID - 小写字母、数字、连字符和英文句点组成
  content: string // YAML 内容
  createdAt: string
  updatedAt: string
}

// Fetcher 相关
export interface Fetcher {
  id: string // Fetcher ID - 小写字母、数字、连字符和英文句点组成
  url: string // Fetcher URL
  createdAt: string
  updatedAt: string
}

// API 响应类型
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Clash 配置相关
export interface ClashProxy {
  name: string
  type: string
  server: string
  port: number
  [key: string]: any
}

export interface ClashConfig {
  proxies?: ClashProxy[]
  [key: string]: any
}

// 表单类型
export interface LoginForm {
  token: string
}

export interface ProxyProviderForm {
  id: string
  subscriptionUrl: string
}

export interface ConfigForm {
  id: string
  content: string
}

export interface FetcherForm {
  id: string
  url: string
}

export interface SettingsForm {
  newToken: string
  confirmToken: string
}

// 路由参数类型
export interface RouteParams {
  sourceId?: string
  configId?: string
  fetcherId?: string
}

// KV 存储键名
export enum KVKeys {
  AUTH_TOKEN = 'auth:token',
  PROXY_PROVIDERS = 'proxy-providers',
  CONFIGS = 'configs',
  FETCHERS = 'fetchers',
}

// ID 验证正则
export const ID_PATTERN = /^[a-z0-9.]+(-[a-z0-9.]+)*$/

// 错误类型
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
