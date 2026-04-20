import { Request, Response, NextFunction } from 'express'
import { AppError } from '../types'
import { desensitize } from '../utils/sanitize'
import { createRequestLogger } from '../logger'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * 全局错误处理中间件
 * 统一处理所有错误，生产环境脱敏
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const log = createRequestLogger(req)

  // 脱敏后记录错误详情（避免敏感信息泄露到日志）
  const safeErr = desensitize({
    name: err.name,
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  })

  // 记录错误日志
  if (err instanceof AppError && err.statusCode < 500) {
    log.warn(`业务错误: ${err.message}`, safeErr as any)
  } else {
    log.error('请求处理异常', err, safeErr as any)
  }

  // 如果是已知的应用错误，返回对应的 HTTP 状态码
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId: req.requestId,
      ...(!isProduction && {
        stack: err.stack,
        isOperational: err.isOperational,
      }),
    })
    return
  }

  // 处理 Prisma 错误
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any
    // P2002: 唯一约束冲突
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: isProduction ? '数据冲突' : `唯一约束冲突: ${prismaError.meta?.target?.join(', ')}`,
        requestId: req.requestId,
      })
      return
    }
    // P2025: 记录不存在
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: '资源不存在',
        requestId: req.requestId,
      })
      return
    }
  }

  // 处理 Zod 验证错误
  if (err.name === 'ZodError') {
    const zodError = err as any
    res.status(400).json({
      success: false,
      message: '参数验证失败',
      requestId: req.requestId,
      ...(!isProduction && {
        errors: zodError.errors,
      }),
    })
    return
  }

  // 未知错误，生产环境脱敏
  res.status(500).json({
    success: false,
    message: isProduction ? '服务器内部错误' : err.message,
    requestId: req.requestId,
    ...(!isProduction && {
      stack: err.stack,
    }),
  })
}

/**
 * 包装异步路由处理函数，自动捕获错误
 * 替代 try-catch 样板代码
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
