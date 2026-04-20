import { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import path from 'path'
import { desensitizeQuery } from '../utils/sanitize'

// 审计日志配置
const AUDIT_LOG_DIR = path.join(process.cwd(), 'logs')
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'audit.log')

// 是否记录 GET 读操作（由 AUDIT_LOG_READS 环境变量控制，默认 false）
const AUDIT_LOG_READS = process.env.AUDIT_LOG_READS === 'true'

// 日志最大行数（超出后保留最新的 N 行），每 100 次写入检查一次
const AUDIT_MAX_LINES = parseInt(process.env.AUDIT_MAX_LINES || '10000', 10)
let _auditWriteCount = 0

// 确保日志目录存在
if (!fs.existsSync(AUDIT_LOG_DIR)) {
  fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true })
}

// Request 扩展：审计上下文
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        before?: Record<string, unknown>
        after?: Record<string, unknown>
        entityName?: string
      }
    }
  }
}

// 审计日志条目接口
interface AuditLogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  requestId: string
  action: string
  method: string
  path: string
  ip: string
  userAgent?: string
  statusCode: number
  duration?: number
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  diff?: Record<string, { from: unknown; to: unknown }>
  details?: Record<string, unknown>
}

/**
 * 计算两个对象之间的差异
 * 用于生成变更前后对比
 */
function computeDiff(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): Record<string, { from: unknown; to: unknown }> | undefined {
  if (!before && !after) return undefined

  const diff: Record<string, { from: unknown; to: unknown }> = {}
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ])

  for (const key of allKeys) {
    const b = before?.[key]
    const a = after?.[key]
    // 跳过函数、undefined 比较
    if (typeof b === 'function' || typeof a === 'function') continue
    if (b !== a) {
      diff[key] = { from: b, to: a }
    }
  }

  return Object.keys(diff).length > 0 ? diff : undefined
}

/**
 * 过滤实体中的敏感字段（只保留关键可读字段用于审计）
 */
function sanitizeEntity(entity: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!entity) return undefined
  const importantFields = ['id', 'name', 'company', 'model', 'sn', 'status', 'datacenter', 'cabinet']
  const result: Record<string, unknown> = {}
  for (const key of importantFields) {
    if (key in entity) {
      result[key] = entity[key]
    }
  }
  return result
}

// 日志轮转：超过最大行数时保留最新的 AUDIT_MAX_LINES 行
function rotateAuditLogIfNeeded() {
  if (!fs.existsSync(AUDIT_LOG_FILE)) return
  const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8')
  const lines = content.split('\n').filter(Boolean)
  if (lines.length > AUDIT_MAX_LINES) {
    fs.writeFileSync(AUDIT_LOG_FILE, lines.slice(-AUDIT_MAX_LINES).join('\n') + '\n', 'utf-8')
  }
}

// 写入审计日志
function writeAuditLog(entry: AuditLogEntry) {
  const logLine = JSON.stringify(entry) + '\n'
  fs.appendFile(AUDIT_LOG_FILE, logLine, (err) => {
    if (err) {
      console.error('[Audit] 写入日志失败:', err)
      return
    }
    _auditWriteCount++
    if (_auditWriteCount % 100 === 0) {
      try { rotateAuditLogIfNeeded() } catch (e) { console.error('[Audit] 日志轮转失败:', e) }
    }
  })
}

// 需要记录的关键操作
const CRITICAL_ACTIONS = [
  { method: 'POST', path: '/api/servers', action: '创建服务器' },
  { method: 'PUT', path: '/api/servers/', action: '更新服务器' },
  { method: 'DELETE', path: '/api/servers/', action: '删除服务器' },
  { method: 'POST', path: '/api/servers/batch-delete', action: '批量删除服务器' },
  { method: 'POST', path: '/api/networks', action: '创建网络信息' },
  { method: 'PUT', path: '/api/networks/', action: '更新网络信息' },
  { method: 'DELETE', path: '/api/networks/', action: '删除网络信息' },
  { method: 'POST', path: '/api/applications', action: '创建应用信息' },
  { method: 'PUT', path: '/api/applications/', action: '更新应用信息' },
  { method: 'DELETE', path: '/api/applications/', action: '删除应用信息' },
  { method: 'POST', path: '/api/field-definitions', action: '创建字段定义' },
  { method: 'PUT', path: '/api/field-definitions/', action: '更新字段定义' },
  { method: 'DELETE', path: '/api/field-definitions/', action: '删除字段定义' },
]

// 审计中间件
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  // 记录原始 end 方法
  const originalEnd = res.end.bind(res)

  // 重写 end 方法以捕获响应状态
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime

    // 匹配关键操作
    const matchedAction = CRITICAL_ACTIONS.find(
      (action) =>
        req.method === action.method &&
        (req.path === action.path || req.path.startsWith(action.path))
    )

    // 记录所有写操作，以及关键读操作（如导出）
    // GET 读操作由 AUDIT_LOG_READS 环境变量控制（默认关闭）
    const shouldLog =
      matchedAction ||
      (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') ||
      req.path.includes('/export/') ||
      (AUDIT_LOG_READS && (req.method === 'GET' || req.method === 'HEAD'))

    if (shouldLog) {
      // 计算变更差异
      const before = sanitizeEntity(req.auditContext?.before)
      const after = sanitizeEntity(req.auditContext?.after)
      const diff = computeDiff(before, after)

      const entry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 400 ? 'ERROR' : res.statusCode >= 300 ? 'WARN' : 'INFO',
        requestId: req.requestId,
        action: matchedAction?.action || `${req.method} ${req.path}`,
        method: req.method,
        path: req.path,
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        duration,
        before,
        after,
        diff,
        details: {
          query: desensitizeQuery(req.query as Record<string, unknown>),
          bodySize: req.body ? JSON.stringify(req.body).length : 0,
        },
      }

      writeAuditLog(entry)
    }

    // 调用原始 end 方法
    return originalEnd(chunk, encoding, cb)
  } as any

  next()
}

/**
 * 设置审计上下文的辅助函数
 * 在 Controller/Service 中，更新前调用 setAuditBefore，保存后调用 setAuditAfter
 */
export function setAuditContext(req: Request, context: { before?: Record<string, unknown>; after?: Record<string, unknown>; entityName?: string }) {
  req.auditContext = context
}

// 获取审计日志（仅限开发环境）
export function getAuditLogs(req: Request, res: Response) {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return res.json({ success: true, data: [] })
    }

    const logs = fs
      .readFileSync(AUDIT_LOG_FILE, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .slice(-100) // 只返回最近 100 条
      .map((line) => JSON.parse(line))

    return res.json({ success: true, data: logs })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}