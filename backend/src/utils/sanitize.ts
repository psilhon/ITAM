/**
 * 数据脱敏工具
 * 用于日志脱敏和 Excel 防公式注入
 */

/**
 * Excel 公式注入防护
 * 以 = + - @ \\t \\r 开头的单元格会被 Excel 解析为公式
 * 统一在前面加单引号强制转为文本
 */
export function sanitizeExcelCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // 检查是否以公式触发字符开头
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

/**
 * 日志脱敏配置
 * key: 字段名（不区分大小写匹配），value: 显示格式
 */
const SENSITIVE_FIELDS: Record<string, string> = {
  password: '[密码]',
  passwd: '[密码]',
  secret: '[密钥]',
  token: '[令牌]',
  apiKey: '[密钥]',
  api_key: '[密钥]',
  accessKey: '[密钥]',
  access_key: '[密钥]',
  authorization: '[授权]',
  cookie: '[Cookie]',
  session: '[会话]',
  ipmiAccount: '[IPMI账号]',
  ipmiPassword: '[IPMI密码]',
  privateKey: '[私钥]',
  private_key: '[私钥]',
  creditCard: '[银行卡]',
  ssn: '[身份证]',
}

/**
 * 判断一个字段名是否为敏感字段
 */
export function isSensitiveField(key: string): boolean {
  const lower = key.toLowerCase()
  return Object.keys(SENSITIVE_FIELDS).some(
    (field) => lower === field.toLowerCase()
  )
}

/**
 * 递归脱敏对象中的敏感字段
 * 用于日志记录时过滤敏感信息
 */
export function desensitize<T = Record<string, unknown>>(obj: T, depth = 0): T {
  // 防止递归过深
  if (depth > 10 || obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => desensitize(item, depth + 1)) as unknown as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveField(key)) {
        result[key] = SENSITIVE_FIELDS[key.toLowerCase()] ?? '[敏感数据]'
      } else if (typeof value === 'object' && value !== null) {
        result[key] = desensitize(value as Record<string, unknown>, depth + 1)
      } else {
        result[key] = value
      }
    }
    return result as T
  }

  return obj
}

/**
 * 浅层脱敏（只处理顶层字段，不递归）
 * 性能敏感场景使用
 */
export function desensitizeShallow(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      result[key] = SENSITIVE_FIELDS[key.toLowerCase()] ?? '[敏感数据]'
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * 从 URL 或查询参数中提取可脱敏版本
 * query 参数中的敏感字段也会被过滤
 */
export function desensitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  return desensitizeShallow(query)
}
