/**
 * 结构化日志系统
 * 支持多种日志级别和上下文追踪
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  requestId?: string
  userId?: string
  action?: string
  entity?: string
  entityId?: number | string
  [key: string]: unknown
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: Error
}

/**
 * 日志级别优先级
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * 从环境变量获取当前日志级别
 */
const CURRENT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

/**
 * 检查是否应该记录该级别的日志
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL]
}

/**
 * 格式化日志条目为字符串
 */
function formatLogEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`
  
  if (entry.context && Object.keys(entry.context).length > 0) {
    const contextStr = Object.entries(entry.context)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ')
    return `${base} | ${contextStr}`
  }
  
  return base
}

/**
 * 输出日志到控制台
 */
function outputLog(entry: LogEntry): void {
  const formatted = formatLogEntry(entry)
  
  switch (entry.level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      if (entry.error) {
        console.error(entry.error.stack)
      }
      break
  }
}

/**
 * 创建日志条目
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error,
  }
}

/**
 * 记录调试日志
 */
export function debug(message: string, context?: LogContext): void {
  if (shouldLog('debug')) {
    outputLog(createLogEntry('debug', message, context))
  }
}

/**
 * 记录信息日志
 */
export function info(message: string, context?: LogContext): void {
  if (shouldLog('info')) {
    outputLog(createLogEntry('info', message, context))
  }
}

/**
 * 记录警告日志
 */
export function warn(message: string, context?: LogContext): void {
  if (shouldLog('warn')) {
    outputLog(createLogEntry('warn', message, context))
  }
}

/**
 * 记录错误日志
 */
export function error(message: string, err?: Error, context?: LogContext): void {
  if (shouldLog('error')) {
    outputLog(createLogEntry('error', message, context, err))
  }
}

/**
 * 创建带上下文的日志记录器
 */
export function createLogger(baseContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) =>
      debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      warn(message, { ...baseContext, ...context }),
    error: (message: string, err?: Error, context?: LogContext) =>
      error(message, err, { ...baseContext, ...context }),
  }
}

/**
 * 从 Express Request 快速创建带 requestId 的日志记录器
 */
export function createRequestLogger(req: Request): ReturnType<typeof createLogger> {
  return createLogger({ requestId: req.requestId })
}

// 导入 Request 类型（延迟引入避免循环依赖）
import type { Request } from 'express'

/**
 * 业务操作审计日志
 * 用于记录重要的业务操作
 */
export function auditLog(
  action: string,
  entity: string,
  entityId: number | string,
  details?: Record<string, unknown>,
  userId?: string
): void {
  info(`Audit: ${action}`, {
    action,
    entity,
    entityId,
    userId,
    ...details,
  })
}

// 默认导出
export default {
  debug,
  info,
  warn,
  error,
  createLogger,
  auditLog,
}
