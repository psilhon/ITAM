/**
 * API 版本控制中间件
 * 支持通过 URL 路径或 Header 进行版本控制
 */

import { Request, Response, NextFunction } from 'express'

// 支持的API版本
export type ApiVersion = 'v1'

// 当前默认版本
export const DEFAULT_API_VERSION: ApiVersion = 'v1'

// 所有支持的版本
export const SUPPORTED_API_VERSIONS: ApiVersion[] = ['v1']

/**
 * 从请求中提取API版本
 * 优先级: URL路径 > Header > 默认版本
 */
export function extractApiVersion(req: Request): ApiVersion {
  // 1. 从URL路径提取版本 (e.g., /api/v1/servers)
  const pathMatch = req.path.match(/\/api\/(v\d+)\//)
  if (pathMatch) {
    const version = pathMatch[1] as ApiVersion
    if (SUPPORTED_API_VERSIONS.includes(version)) {
      return version
    }
  }

  // 2. 从Header提取版本
  const headerVersion = req.headers['api-version'] as string
  if (headerVersion) {
    const normalizedVersion = headerVersion.toLowerCase().startsWith('v') 
      ? headerVersion.toLowerCase() 
      : `v${headerVersion}`
    
    if (SUPPORTED_API_VERSIONS.includes(normalizedVersion as ApiVersion)) {
      return normalizedVersion as ApiVersion
    }
  }

  // 3. 使用默认版本
  return DEFAULT_API_VERSION
}

/**
 * API版本控制中间件
 * 将版本信息附加到请求对象
 */
export function versionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 在请求对象上附加版本信息
  ;(req as Request & { apiVersion: ApiVersion }).apiVersion = extractApiVersion(req)
  next()
}

/**
 * 版本检查中间件
 * 如果请求的API版本不受支持，返回错误
 */
export function versionCheckMiddleware(req: Request, res: Response, next: NextFunction): void {
  const version = extractApiVersion(req)
  
  if (!SUPPORTED_API_VERSIONS.includes(version)) {
    res.status(400).json({
      success: false,
      message: `不支持的API版本: ${version}. 支持的版本: ${SUPPORTED_API_VERSIONS.join(', ')}`,
    })
    return
  }
  
  next()
}

/**
 * 声明扩展 - 为Express Request添加apiVersion属性
 */
declare global {
  namespace Express {
    interface Request {
      apiVersion?: ApiVersion
    }
  }
}
