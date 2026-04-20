/**
 * RequestId 中间件
 * 为每个请求生成唯一 ID，便于全链路追踪
 */

import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

// Request 对象扩展
declare global {
  namespace Express {
    interface Request {
      requestId: string
    }
  }
}

/**
 * 从请求头提取 requestId，没有则生成新的
 */
export function getOrCreateRequestId(req: Request): string {
  const incoming = req.headers['x-request-id']
  if (typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 64) {
    return incoming
  }
  return randomUUID()
}

/**
 * RequestId 中间件
 * - 优先使用客户端传入的 x-request-id（防止穿透性）
 * - 否则自动生成 UUID
 * - 将 ID 写入响应头，方便前端排查
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = getOrCreateRequestId(req)
  req.requestId = id
  res.setHeader('x-request-id', id)
  next()
}
