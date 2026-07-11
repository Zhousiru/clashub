import * as yaml from 'js-yaml'

export type SubscriptionFormat =
  | 'clash-yaml'
  | 'base64-clash-yaml'
  | 'uri-list'
  | 'base64-uri-list'
  | 'sip008-json'
  | 'base64-sip008-json'

export interface ParsedProxySubscription {
  proxies: Array<Record<string, unknown>>
  format: SubscriptionFormat
}

export class SubscriptionFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubscriptionFormatError'
  }
}

const URI_SCHEMES = new Set([
  'anytls',
  'http',
  'https',
  'hy',
  'hy2',
  'hysteria',
  'hysteria2',
  'socks',
  'socks5',
  'ss',
  'ssd',
  'ssr',
  'trojan',
  'tuic',
  'vless',
  'vmess',
])

function cleanText(value: string): string {
  return value.replace(/^\uFEFF/, '').trim()
}

function decodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function decodeBase64Text(value: string): string | null {
  const compact = value.replace(/\s+/g, '')
  if (compact.length < 4 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(compact)) {
    return null
  }

  const remainder = compact.length % 4
  if (remainder === 1) return null

  const normalized = compact.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - remainder) % 4), '=')

  try {
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (decoded.includes('\0')) return null
    return cleanText(decoded)
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isProxyObject(value: unknown): value is Record<string, unknown> {
  const record = asRecord(value)
  return Boolean(record && typeof record.name === 'string' && typeof record.type === 'string')
}

function asPort(value: unknown): number {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new SubscriptionFormatError(`无效的代理端口: ${String(value)}`)
  }
  return port
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined
  if (['1', 'true', 'yes'].includes(value.toLowerCase())) return true
  if (['0', 'false', 'no'].includes(value.toLowerCase())) return false
  return undefined
}

function proxyName(url: URL, fallback: string): string {
  const hashName = decodeUriComponent(url.hash.slice(1)).trim()
  return hashName || url.searchParams.get('remarks')?.trim() || fallback
}

function proxyHostname(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, '')
}

function setIfPresent(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  if (value !== undefined && value !== null && value !== '') target[key] = value
}

function applyTlsOptions(proxy: Record<string, unknown>, params: URLSearchParams) {
  const security = params.get('security')?.toLowerCase()
  if (security === 'tls' || security === 'reality') proxy.tls = true

  setIfPresent(proxy, 'servername', params.get('sni') ?? params.get('peer'))
  setIfPresent(proxy, 'client-fingerprint', params.get('fp'))

  const insecure = parseBoolean(
    params.get('allowInsecure') ??
      params.get('allow-insecure') ??
      params.get('insecure'),
  )
  if (insecure !== undefined) proxy['skip-cert-verify'] = insecure

  const alpn = params.get('alpn')
  if (alpn) proxy.alpn = alpn.split(',').filter(Boolean)

  if (security === 'reality') {
    const realityOptions: Record<string, unknown> = {}
    setIfPresent(realityOptions, 'public-key', params.get('pbk'))
    setIfPresent(realityOptions, 'short-id', params.get('sid'))
    if (Object.keys(realityOptions).length > 0) {
      proxy['reality-opts'] = realityOptions
    }
  }
}

function applyTransportOptions(
  proxy: Record<string, unknown>,
  params: URLSearchParams,
  defaults: { network?: string; host?: string; path?: string } = {},
) {
  const network = (
    params.get('type') ??
    params.get('network') ??
    defaults.network ??
    ''
  ).toLowerCase()

  if (network && network !== 'tcp') proxy.network = network

  const host = params.get('host') ?? defaults.host
  const path = params.get('path') ?? defaults.path

  if (network === 'ws') {
    const wsOptions: Record<string, unknown> = {}
    setIfPresent(wsOptions, 'path', path)
    if (host) wsOptions.headers = { Host: host }

    const earlyData = params.get('ed')
    if (earlyData) {
      const maxEarlyData = Number(earlyData)
      if (Number.isFinite(maxEarlyData)) wsOptions['max-early-data'] = maxEarlyData
      setIfPresent(
        wsOptions,
        'early-data-header-name',
        params.get('eh') ?? 'Sec-WebSocket-Protocol',
      )
    }

    proxy['ws-opts'] = wsOptions
  } else if (network === 'grpc') {
    const grpcOptions: Record<string, unknown> = {}
    setIfPresent(
      grpcOptions,
      'grpc-service-name',
      params.get('serviceName') ?? params.get('service-name') ?? path,
    )
    proxy['grpc-opts'] = grpcOptions
  } else if (network === 'h2' || network === 'http') {
    const h2Options: Record<string, unknown> = {}
    setIfPresent(h2Options, 'path', path)
    if (host) h2Options.host = host.split(',').filter(Boolean)
    proxy['h2-opts'] = h2Options
  }
}

function parseUrl(uri: string, index: number): URL {
  try {
    return new URL(uri)
  } catch {
    throw new SubscriptionFormatError(`第 ${index + 1} 个代理链接格式无效`)
  }
}

function parseVmess(uri: string, index: number): Record<string, unknown> {
  const encoded = uri.slice('vmess://'.length).split('#', 1)[0]
  const decoded = decodeBase64Text(encoded)
  if (!decoded) throw new SubscriptionFormatError(`第 ${index + 1} 个 VMess 链接无法解码`)

  let source: Record<string, unknown>
  try {
    source = JSON.parse(decoded) as Record<string, unknown>
  } catch {
    throw new SubscriptionFormatError(`第 ${index + 1} 个 VMess 链接不是有效 JSON`)
  }

  const proxy: Record<string, unknown> = {
    name: String(source.ps || `VMess ${index + 1}`),
    type: 'vmess',
    server: String(source.add || ''),
    port: asPort(source.port),
    uuid: String(source.id || ''),
    alterId: Number(source.aid || 0),
    cipher: String(source.scy || 'auto'),
    udp: true,
  }

  if (!proxy.server || !proxy.uuid) {
    throw new SubscriptionFormatError(`第 ${index + 1} 个 VMess 链接缺少服务器或 UUID`)
  }

  const params = new URLSearchParams()
  setIfPresent(proxy, 'servername', source.sni)
  setIfPresent(proxy, 'client-fingerprint', source.fp)
  if (source.tls === 'tls') proxy.tls = true
  if (source.alpn) proxy.alpn = String(source.alpn).split(',').filter(Boolean)

  applyTransportOptions(proxy, params, {
    network: String(source.net || 'tcp'),
    host: source.host ? String(source.host) : undefined,
    path: source.path ? String(source.path) : undefined,
  })
  return proxy
}

function parseSsPlugin(value: string): { name: string; options?: Record<string, unknown> } {
  const [name, ...parts] = value.split(';')
  const options: Record<string, unknown> = {}

  for (const part of parts) {
    const separator = part.indexOf('=')
    if (separator === -1) {
      if (part) options[part] = true
    } else {
      options[part.slice(0, separator)] = part.slice(separator + 1)
    }
  }

  return { name, options: Object.keys(options).length > 0 ? options : undefined }
}

function parseSs(uri: string, index: number): Record<string, unknown> {
  const url = parseUrl(uri, index)
  let method = ''
  let password = ''
  let server = proxyHostname(url)
  let port = url.port

  if (url.username && server && port) {
    if (url.password) {
      method = decodeUriComponent(url.username)
      password = decodeUriComponent(url.password)
    } else {
      const credentials = decodeBase64Text(url.username) ?? decodeUriComponent(url.username)
      const separator = credentials.indexOf(':')
      if (separator !== -1) {
        method = credentials.slice(0, separator)
        password = credentials.slice(separator + 1)
      }
    }
  } else {
    const encoded = uri.slice('ss://'.length).split(/[?#]/, 1)[0]
    const decoded = decodeBase64Text(encoded)
    if (!decoded) throw new SubscriptionFormatError(`第 ${index + 1} 个 SS 链接无法解码`)

    const at = decoded.lastIndexOf('@')
    const colon = decoded.indexOf(':')
    if (at === -1 || colon === -1 || colon > at) {
      throw new SubscriptionFormatError(`第 ${index + 1} 个 SS 链接格式无效`)
    }

    method = decoded.slice(0, colon)
    password = decoded.slice(colon + 1, at)
    const endpoint = new URL(`tcp://${decoded.slice(at + 1)}`)
    server = proxyHostname(endpoint)
    port = endpoint.port
  }

  if (!method || !password || !server || !port) {
    throw new SubscriptionFormatError(`第 ${index + 1} 个 SS 链接字段不完整`)
  }

  const proxy: Record<string, unknown> = {
    name: proxyName(url, `SS ${index + 1}`),
    type: 'ss',
    server,
    port: asPort(port),
    cipher: method,
    password,
    udp: true,
  }

  const pluginValue = url.searchParams.get('plugin')
  if (pluginValue) {
    const plugin = parseSsPlugin(pluginValue)
    proxy.plugin = plugin.name
    if (plugin.options) proxy['plugin-opts'] = plugin.options
  }

  return proxy
}

function parseSsr(uri: string, index: number): Record<string, unknown> {
  const decoded = decodeBase64Text(uri.slice('ssr://'.length))
  if (!decoded) throw new SubscriptionFormatError(`第 ${index + 1} 个 SSR 链接无法解码`)

  const [main, query = ''] = decoded.split('/?', 2)
  const match = /^(.+):(\d+):([^:]+):([^:]+):([^:]+):(.+)$/.exec(main)
  if (!match) throw new SubscriptionFormatError(`第 ${index + 1} 个 SSR 链接格式无效`)

  const [, rawServer, port, protocol, cipher, obfs, encodedPassword] = match
  const server = rawServer.replace(/^\[|\]$/g, '')
  const password = decodeBase64Text(encodedPassword)
  if (!password) throw new SubscriptionFormatError(`第 ${index + 1} 个 SSR 密码无法解码`)

  const params = new URLSearchParams(query)
  const remarks = params.get('remarks')
  const proxy: Record<string, unknown> = {
    name: (remarks && decodeBase64Text(remarks)) || `SSR ${index + 1}`,
    type: 'ssr',
    server,
    port: asPort(port),
    cipher,
    password,
    protocol,
    obfs,
    udp: true,
  }

  const protocolParam = params.get('protoparam')
  const obfsParam = params.get('obfsparam')
  if (protocolParam) proxy['protocol-param'] = decodeBase64Text(protocolParam) ?? protocolParam
  if (obfsParam) proxy['obfs-param'] = decodeBase64Text(obfsParam) ?? obfsParam
  return proxy
}

function parseStandardUrl(uri: string, index: number): Record<string, unknown> {
  const url = parseUrl(uri, index)
  const scheme = url.protocol.slice(0, -1).toLowerCase()
  const server = proxyHostname(url)
  const defaultPort = scheme === 'http' ? 80 : scheme === 'https' ? 443 : undefined
  const port = asPort(url.port || defaultPort)
  const params = url.searchParams
  const common = {
    name: proxyName(url, `${scheme.toUpperCase()} ${index + 1}`),
    server,
    port,
    udp: true,
  }

  let proxy: Record<string, unknown>

  switch (scheme) {
    case 'vless':
      proxy = {
        ...common,
        type: 'vless',
        uuid: decodeUriComponent(url.username),
      }
      setIfPresent(proxy, 'flow', params.get('flow'))
      applyTlsOptions(proxy, params)
      applyTransportOptions(proxy, params)
      break
    case 'trojan':
      proxy = {
        ...common,
        type: 'trojan',
        password: decodeUriComponent(url.username),
      }
      proxy.tls = params.get('security') !== 'none'
      applyTlsOptions(proxy, params)
      applyTransportOptions(proxy, params)
      break
    case 'hy':
    case 'hysteria':
      proxy = {
        ...common,
        type: 'hysteria',
        'auth-str': decodeUriComponent(url.username || url.password),
      }
      setIfPresent(proxy, 'up', params.get('upmbps') ?? params.get('up'))
      setIfPresent(proxy, 'down', params.get('downmbps') ?? params.get('down'))
      setIfPresent(proxy, 'obfs', params.get('obfs'))
      applyTlsOptions(proxy, params)
      break
    case 'hy2':
    case 'hysteria2':
      proxy = {
        ...common,
        type: 'hysteria2',
        password: decodeUriComponent(url.username || url.password),
      }
      setIfPresent(proxy, 'obfs', params.get('obfs'))
      setIfPresent(proxy, 'obfs-password', params.get('obfs-password'))
      applyTlsOptions(proxy, params)
      break
    case 'tuic':
      proxy = {
        ...common,
        type: 'tuic',
        uuid: decodeUriComponent(url.username),
        password: decodeUriComponent(url.password),
      }
      setIfPresent(proxy, 'congestion-controller', params.get('congestion_control'))
      setIfPresent(proxy, 'udp-relay-mode', params.get('udp_relay_mode'))
      applyTlsOptions(proxy, params)
      break
    case 'anytls':
      proxy = {
        ...common,
        type: 'anytls',
        password: decodeUriComponent(url.username || url.password),
      }
      applyTlsOptions(proxy, params)
      break
    case 'socks':
    case 'socks5':
      proxy = { ...common, type: 'socks5' }
      setIfPresent(proxy, 'username', decodeUriComponent(url.username))
      setIfPresent(proxy, 'password', decodeUriComponent(url.password))
      if (scheme === 'socks') proxy.version = 5
      break
    case 'http':
    case 'https':
      proxy = { ...common, type: 'http' }
      setIfPresent(proxy, 'username', decodeUriComponent(url.username))
      setIfPresent(proxy, 'password', decodeUriComponent(url.password))
      if (scheme === 'https') proxy.tls = true
      applyTlsOptions(proxy, params)
      break
    default:
      throw new SubscriptionFormatError(`暂不支持 ${scheme}:// 类型的代理链接`)
  }

  if (!server) throw new SubscriptionFormatError(`第 ${index + 1} 个代理链接缺少服务器`)
  return proxy
}

function parseSsd(uri: string): Array<Record<string, unknown>> {
  const decoded = decodeBase64Text(uri.slice('ssd://'.length))
  if (!decoded) throw new SubscriptionFormatError('SSD 订阅无法解码')

  let source: Record<string, unknown>
  try {
    source = JSON.parse(decoded) as Record<string, unknown>
  } catch {
    throw new SubscriptionFormatError('SSD 订阅不是有效 JSON')
  }

  if (!Array.isArray(source.servers)) {
    throw new SubscriptionFormatError('SSD 订阅缺少 servers 数组')
  }

  return source.servers.map((item, index) => {
    const server = asRecord(item)
    if (!server) throw new SubscriptionFormatError(`SSD 第 ${index + 1} 个节点格式无效`)

    const plugin = server.plugin ?? source.plugin
    const pluginOptions = server.plugin_options ?? source.plugin_options
    const proxy: Record<string, unknown> = {
      name: String(server.remarks || `${source.airport || 'SSD'} ${index + 1}`),
      type: 'ss',
      server: String(server.server || ''),
      port: asPort(server.port ?? source.port),
      cipher: String(server.encryption || source.encryption || ''),
      password: String(server.password || source.password || ''),
      udp: true,
    }
    if (plugin) {
      const parsedPlugin = parseSsPlugin(
        `${String(plugin)}${pluginOptions ? `;${String(pluginOptions)}` : ''}`,
      )
      proxy.plugin = parsedPlugin.name
      if (parsedPlugin.options) proxy['plugin-opts'] = parsedPlugin.options
    }
    return proxy
  })
}

function parseSip008(source: Record<string, unknown>): Array<Record<string, unknown>> | null {
  if (!Array.isArray(source.servers)) return null

  const servers = source.servers.map((item, index) => {
    const server = asRecord(item)
    if (!server || !server.server || !server.server_port || !server.method) {
      throw new SubscriptionFormatError(`SIP008 第 ${index + 1} 个节点格式无效`)
    }

    const proxy: Record<string, unknown> = {
      name: String(server.remarks || `SS ${index + 1}`),
      type: 'ss',
      server: String(server.server),
      port: asPort(server.server_port),
      cipher: String(server.method),
      password: String(server.password || ''),
      udp: true,
    }

    if (server.plugin) {
      const parsedPlugin = parseSsPlugin(
        `${String(server.plugin)}${server.plugin_opts ? `;${String(server.plugin_opts)}` : ''}`,
      )
      proxy.plugin = parsedPlugin.name
      if (parsedPlugin.options) proxy['plugin-opts'] = parsedPlugin.options
    }
    return proxy
  })

  return servers
}

function dedupeProxyNames(proxies: Array<Record<string, unknown>>) {
  const counts = new Map<string, number>()
  return proxies.map((proxy, index) => {
    const baseName = String(proxy.name || `${String(proxy.type || 'Proxy')} ${index + 1}`)
    const count = (counts.get(baseName) ?? 0) + 1
    counts.set(baseName, count)
    return count === 1 ? proxy : { ...proxy, name: `${baseName} (${count})` }
  })
}

export function replaceProxyNames(
  proxies: Array<Record<string, unknown>>,
  pattern = '',
  replacement = '',
): Array<Record<string, unknown>> {
  if (pattern.length > 256) {
    throw new SubscriptionFormatError('节点改名正则不能超过 256 个字符')
  }
  if (replacement.length > 512) {
    throw new SubscriptionFormatError('节点改名模板不能超过 512 个字符')
  }

  let expression: RegExp | null = null
  if (pattern) {
    try {
      expression = new RegExp(pattern, 'g')
    } catch (error) {
      throw new SubscriptionFormatError(
        `节点改名正则无效: ${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }

  const renamed = proxies.map((proxy) => {
    if (!expression) return proxy

    const name = String(proxy.name ?? '')
    const nextName = name.replace(expression, replacement)
    if (!nextName) {
      throw new SubscriptionFormatError(`节点改名后名称为空: ${name}`)
    }
    return nextName === name ? proxy : { ...proxy, name: nextName }
  })

  return dedupeProxyNames(renamed)
}

function parseStructured(value: unknown): {
  proxies: Array<Record<string, unknown>>
  format: 'clash-yaml' | 'sip008-json'
} | null {
  if (Array.isArray(value) && value.every(isProxyObject)) {
    return { proxies: value, format: 'clash-yaml' }
  }

  const record = asRecord(value)
  if (!record) return null

  if (Array.isArray(record.proxies) && record.proxies.every(isProxyObject)) {
    return { proxies: record.proxies, format: 'clash-yaml' }
  }

  if (Array.isArray(record.payload) && record.payload.every(isProxyObject)) {
    return { proxies: record.payload, format: 'clash-yaml' }
  }

  const sip008 = parseSip008(record)
  return sip008 ? { proxies: sip008, format: 'sip008-json' } : null
}

function parseUriList(content: string): Array<Record<string, unknown>> | null {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith(';'))

  if (lines.length === 0) return null
  if (!lines.some((line) => /^[a-z][a-z0-9+.-]*:\/\//i.test(line))) {
    return null
  }

  const proxies: Array<Record<string, unknown>> = []

  lines.forEach((line, index) => {
    const schemeMatch = /^([a-z][a-z0-9+.-]*):\/\//i.exec(line)
    if (!schemeMatch) {
      throw new SubscriptionFormatError(`订阅第 ${index + 1} 行不是可识别的代理链接`)
    }

    const scheme = schemeMatch[1].toLowerCase()
    if (!URI_SCHEMES.has(scheme)) {
      throw new SubscriptionFormatError(`暂不支持 ${scheme}:// 类型的代理链接`)
    }

    if (scheme === 'vmess') proxies.push(parseVmess(line, index))
    else if (scheme === 'ss') proxies.push(parseSs(line, index))
    else if (scheme === 'ssr') proxies.push(parseSsr(line, index))
    else if (scheme === 'ssd') proxies.push(...parseSsd(line))
    else proxies.push(parseStandardUrl(line, index))
  })

  return proxies
}

function parseDecodedContent(content: string): {
  proxies: Array<Record<string, unknown>>
  format: 'clash-yaml' | 'uri-list' | 'sip008-json'
} | null {
  try {
    const structured = parseStructured(yaml.load(content))
    if (structured) return structured
  } catch (error) {
    if (error instanceof SubscriptionFormatError) throw error
  }

  const uriList = parseUriList(content)
  return uriList ? { proxies: uriList, format: 'uri-list' } : null
}

export function parseProxySubscription(content: string): ParsedProxySubscription {
  const normalized = cleanText(content)
  if (!normalized) throw new SubscriptionFormatError('订阅内容为空')

  const direct = parseDecodedContent(normalized)
  if (direct) return direct

  const decoded = decodeBase64Text(normalized)
  if (decoded && decoded !== normalized) {
    const parsed = parseDecodedContent(decoded)
    if (parsed) {
      return {
        proxies: parsed.proxies,
        format: `base64-${parsed.format}` as SubscriptionFormat,
      }
    }
  }

  throw new SubscriptionFormatError(
    '无法识别订阅格式；支持 Clash/Mihomo YAML、SIP008/SSD、Base64 编码内容及常见代理 URI 列表',
  )
}
