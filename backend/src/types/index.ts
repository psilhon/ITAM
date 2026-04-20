// 通用类型定义

export type ServerStatus = 'running' | 'offline' | 'maintenance'
export type AppStatus = 'running' | 'stopped' | 'error'
export type AppType = 'web' | 'database' | 'middleware' | 'cache' | 'other' | 'futures_trading' | 'stock_trading' | 'data_related'
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect'
export type Dimension = 'basic' | 'network' | 'app'
export type NicPurpose = 'management' | 'business' | 'storage' | 'bmc' | 'market' | 'trading'

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

// 错误类型
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string = '参数验证失败') {
    super(message, 400)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409)
  }
}

// 分页参数
export interface PaginationParams {
  page: number
  pageSize: number
}

// 分页结果
export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 服务器查询参数
export interface ServerQueryParams extends Partial<PaginationParams> {
  search?: string
  status?: ServerStatus
  datacenter?: string
  owner?: string
  company?: string
  sortBy?: 'company' | 'name' | 'datacenter' | 'status' | 'onlineDate' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

// 网络信息查询参数
export interface NetworkQueryParams {
  serverId: number
}

// 应用信息查询参数
export interface ApplicationQueryParams {
  serverId: number
}
