import { z } from 'zod'

// ─── 公共类型 ────────────────────────────────────────────────

/** IP 地址格式（IPv4，支持 CIDR 如 192.168.1.2/24） */
const ipCidrSchema = z.string()
  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[12][0-9]|3[0-2]))?$/, 'IP 格式不合法（如 192.168.1.2/24）')
  .optional()
  .or(z.literal(''))

/** IP 地址格式（IPv4，不支持 CIDR） */
const ipAddressSchema = z.string()
  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'IP 格式不合法')
  .optional()
  .or(z.literal(''))

/** 通用文本字段（限长）- 部分更新时不用 default，避免填入空字符串 */
const textField = (_min = 1, max = 500) =>
  z.string().max(max, `最长 ${max} 个字符`).optional()

/** 通用必填文本字段 */
const requiredTextField = (_min = 1, max = 200, msg?: string) =>
  z.string().min(1, msg || '不能为空').max(max, `最长 ${max} 个字符`)

// ─── NetworkInfo ────────────────────────────────────────────

const createNetworkSchemaBase = z.object({
  serverId: z.number().int().positive('服务器 ID 无效'),
  nicName: requiredTextField(1, 50, '网卡名称不能为空'),
  ipAddress: ipCidrSchema.nullable().transform(v => v ?? ''),
  nicPurpose: z.enum(['management', 'storage', 'bmc', 'market', 'trading']).nullable().transform(v => v ?? 'management'),
  nicStatus: textField(0, 50).nullable().transform(v => v ?? ''),
  netmask: ipAddressSchema.nullable().transform(v => v ?? ''),
  gateway: ipAddressSchema.nullable().transform(v => v ?? ''),
  dns: textField(0, 200).nullable().transform(v => v ?? ''),
  remark: textField(0, 500).nullable().transform(v => v ?? ''),
})

export const createNetworkSchema = createNetworkSchemaBase
export const updateNetworkSchema = createNetworkSchemaBase.omit({ serverId: true })

// ─── Application ────────────────────────────────────────────

const accountBindingSchema = z.string().refine(
  (val) => {
    if (!val || val.trim() === '') return true
    try { JSON.parse(val); return true } catch { return false }
  },
  { message: '账号绑定 JSON 格式有误' }
).optional().default('')

const createAppSchemaBase = z.object({
  serverId: z.number().int().positive('服务器 ID 无效'),
  appName: requiredTextField(1, 100, '应用名称不能为空'),
  appType: z.enum(['web', 'database', 'middleware', 'cache', 'futures_trading', 'stock_trading', 'data_related', 'other']).optional().default('web'),
  status: z.enum(['running', 'stopped', 'error']).optional().default('running'),
  deployPath: textField(0, 500).nullable().transform(v => v ?? ''),
  accountBinding: accountBindingSchema,
  remark: textField(0, 500).nullable().transform(v => v ?? ''),
})

export const createAppSchema = createAppSchemaBase
export const updateAppSchema = createAppSchemaBase.omit({ serverId: true })

// ─── Server ─────────────────────────────────────────────────

export const createServerSchema = z.object({
  company: textField(0, 100),
  name: requiredTextField(1, 100, '服务器名称不能为空'),
  model: textField(0, 100),
  brand: textField(0, 100),
  sn: z.string().max(100).optional().default(''),
  cpu: textField(0, 200),
  cpuCores: textField(0, 50),
  logicalCores: textField(0, 50),
  cpuArch: textField(0, 50),
  memory: textField(0, 100),
  memoryModules: textField(0, 200),
  disk: textField(0, 200),
  diskType: textField(0, 100),
  os: textField(0, 100),
  osKernel: textField(0, 200),
  osManagement: textField(0, 500),
  oobManagement: textField(0, 500),
  remoteAccess: textField(0, 1000),
  routeInfo: textField(0, 5000),
  nicModel: textField(0, 5000),
  datacenter: textField(0, 100),
  cabinet: textField(0, 50),
  status: z.enum(['running', 'offline', 'maintenance']).optional().default('running'),
  onlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional().or(z.literal('')),
  offlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional().or(z.literal('')),
  owner: textField(0, 100),
  remark: textField(0, 1000),
  // 关联数据：用严格 Schema 数组替代 z.any()
  networkInfos: z.array(createNetworkSchemaBase.omit({ serverId: true })).optional().default([]),
  applications: z.array(createAppSchemaBase.omit({ serverId: true })).optional().default([]),
})

export const updateServerSchema = createServerSchema.partial().omit({
  networkInfos: true,
  applications: true,
})

// 批量删除Schema（前端已有确认弹窗，后端只做数量校验）
export const batchDeleteSchema = z.object({
  ids: z.array(z.number().int().positive('ID 必须为正整数'))
    .min(1, '至少选择一台服务器')
    .max(100, '单次最多删除 100 台服务器'),
})

// ─── Helper ─────────────────────────────────────────────────

/**
 * 校验并返回解析结果，失败抛出带 statusCode 的错误
 */
export function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const firstError = result.error.issues[0]
    const path = firstError.path.join('.')
    const message = firstError
      ? `${firstError.message}${path ? `（${path}）` : ''}`
      : '请求参数不合法'
    const err: any = new Error(message)
    err.statusCode = 400
    throw err
  }
  return result.data
}

// ─── NetworkDevice ─────────────────────────────────────────

const createNetworkDeviceSchemaBase = z.object({
  name: requiredTextField(1, 100, '设备名称不能为空'),
  deviceType: z.enum(['switch', 'router', 'firewall', 'lb', 'other']),
  brand: textField(0, 100).nullable().transform(v => v ?? ''),
  model: textField(0, 100).nullable().transform(v => v ?? ''),
  sn: textField(0, 100).nullable().transform(v => v ?? ''),
  managementIp: ipAddressSchema.nullable().transform(v => v ?? ''),
  ports: textField(0, 100).nullable().transform(v => v ?? ''),
  firmware: textField(0, 100).nullable().transform(v => v ?? ''),
  datacenter: textField(0, 100).nullable().transform(v => v ?? ''),
  cabinet: textField(0, 50).nullable().transform(v => v ?? ''),
  rackUnit: textField(0, 20).nullable().transform(v => v ?? ''),
  status: z.enum(['running', 'offline', 'maintenance']).optional().default('running'),
  onlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional().or(z.literal('')).nullable().transform(v => v ?? ''),
  offlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional().or(z.literal('')).nullable().transform(v => v ?? ''),
  owner: textField(0, 100).nullable().transform(v => v ?? ''),
  remark: textField(0, 1000).nullable().transform(v => v ?? ''),
})

export const createNetworkDeviceSchema = createNetworkDeviceSchemaBase
export const updateNetworkDeviceSchema = createNetworkDeviceSchemaBase
