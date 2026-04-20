/**
 * Application 充血领域模型
 * 封装应用信息的业务规则
 */

import { Application as PrismaApplication } from '@prisma/client'
import { AppStatus, AppType } from '../../types'

// Application 数据类型（从 Prisma 类型派生，包含所有字段）
export type ApplicationData = PrismaApplication

/**
 * Application 领域实体
 */
export class Application {
  private _data: ApplicationData

  constructor(data: ApplicationData) {
    this._data = data
  }

  // ─── Getters ─────────────────────────────────────────────────

  get id(): number {
    return this._data.id
  }

  get serverId(): number {
    return this._data.serverId
  }

  get appName(): string {
    return this._data.appName
  }

  get appType(): AppType {
    return this._data.appType as AppType
  }

  get status(): AppStatus {
    return this._data.status as AppStatus
  }

  get deployPath(): string | null {
    return this._data.deployPath
  }

  get remark(): string | null {
    return this._data.remark
  }

  get createdAt(): Date {
    return this._data.createdAt
  }

  get updatedAt(): Date {
    return this._data.updatedAt
  }

  // ─── 业务规则检查 ────────────────────────────────────────────

  /**
   * 检查应用是否运行中
   */
  isRunning(): boolean {
    return this.status === 'running'
  }

  /**
   * 检查应用是否已停止
   */
  isStopped(): boolean {
    return this.status === 'stopped'
  }

  /**
   * 检查应用是否有错误
   */
   hasError(): boolean {
    return this.status === 'error'
  }

  /**
   * 检查是否为Web应用
   */
  isWebApplication(): boolean {
    return this.appType === 'web'
  }

  /**
   * 检查是否为数据库
   */
  isDatabase(): boolean {
    return this.appType === 'database'
  }

  /**
   * 检查是否为中间件
   */
  isMiddleware(): boolean {
    return this.appType === 'middleware'
  }

  /**
   * 检查是否为缓存服务
   */
  isCache(): boolean {
    return this.appType === 'cache'
  }

  /**
   * 检查是否为交易应用
   */
  isTradingApp(): boolean {
    return this.appType === 'futures_trading' || this.appType === 'stock_trading'
  }

  /**
   * 检查是否为行情应用
   */
  isMarketDataApp(): boolean {
    return this.appType === 'data_related'
  }

  /**
   * 检查是否有部署路径
   */
  hasDeployPath(): boolean {
    return !!this.deployPath && this.deployPath.trim().length > 0
  }

  /**
   * 获取部署路径的目录名
   */
  getDeployDirectory(): string | null {
    if (!this.deployPath) return null
    const parts = this.deployPath.split('/')
    return parts[parts.length - 1] || parts[parts.length - 2] || null
  }

  // ─── 状态变更方法 ────────────────────────────────────────────

  /**
   * 启动应用
   * @throws Error 如果应用已在运行
   */
  start(): void {
    if (this.status === 'running') {
      throw new Error('应用已在运行状态')
    }
    this._data.status = 'running'
    this._data.updatedAt = new Date()
  }

  /**
   * 停止应用
   * @throws Error 如果应用已停止
   */
  stop(): void {
    if (this.status === 'stopped') {
      throw new Error('应用已处于停止状态')
    }
    this._data.status = 'stopped'
    this._data.updatedAt = new Date()
  }

  /**
   * 标记应用错误
   */
  markError(): void {
    this._data.status = 'error'
    this._data.updatedAt = new Date()
  }

  /**
   * 重启应用
   */
  restart(): void {
    this._data.status = 'running'
    this._data.updatedAt = new Date()
  }

  // ─── 应用类型辅助方法 ────────────────────────────────────────

  /**
   * 获取应用类型的显示名称
   */
  getAppTypeDisplayName(): string {
    const displayNames: Record<AppType, string> = {
      web: 'Web应用',
      database: '数据库',
      middleware: '中间件',
      cache: '缓存服务',
      other: '其他',
      futures_trading: '期货交易',
      stock_trading: '股票交易',
      data_related: '数据相关',
    }
    return displayNames[this.appType] || '未知类型'
  }

  /**
   * 获取状态的显示名称
   */
  getStatusDisplayName(): string {
    const displayNames: Record<AppStatus, string> = {
      running: '运行中',
      stopped: '已停止',
      error: '错误',
    }
    return displayNames[this.status] || '未知状态'
  }

  // ─── 数据转换 ────────────────────────────────────────────────

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      serverId: this.serverId,
      appName: this.appName,
      appType: this.appType,
      status: this.status,
      deployPath: this.deployPath,
      remark: this.remark,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * 从Prisma数据创建领域实体
   */
  static fromPrisma(data: ApplicationData): Application {
    return new Application(data)
  }
}
