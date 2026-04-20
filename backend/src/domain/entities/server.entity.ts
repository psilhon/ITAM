/**
 * Server 充血领域模型
 * 封装业务规则和领域逻辑
 */

import { Server as PrismaServer, NetworkInfo, Application } from '@prisma/client'
import { ServerStatus } from '../../types'
import { serverEvents } from '../../events'

// 关联数据类型
// 从 Prisma Server 类型派生，确保包含所有字段
export type ServerData = PrismaServer & {
  networkInfos: NetworkInfo[]
  applications: Application[]
}

/**
 * Server 领域实体
 * 包含业务逻辑和行为方法
 */
export class Server {
  private _data: ServerData

  constructor(data: ServerData) {
    this._data = data
  }

  // ─── Getters ─────────────────────────────────────────────────

  get id(): number {
    return this._data.id
  }

  get name(): string {
    return this._data.name
  }

  get company(): string | null {
    return this._data.company
  }

  get status(): ServerStatus {
    return this._data.status as ServerStatus
  }

  get model(): string | null {
    return this._data.model
  }

  get sn(): string | null {
    return this._data.sn
  }

  get cpu(): string | null {
    return this._data.cpu
  }

  get memory(): string | null {
    return this._data.memory
  }

  get disk(): string | null {
    return this._data.disk
  }

  get os(): string | null {
    return this._data.os
  }

  get datacenter(): string | null {
    return this._data.datacenter
  }

  get cabinet(): string | null {
    return this._data.cabinet
  }

  get owner(): string | null {
    return this._data.owner
  }

  get onlineDate(): string | null {
    return this._data.onlineDate
  }

  get createdAt(): Date {
    return this._data.createdAt
  }

  get updatedAt(): Date {
    return this._data.updatedAt
  }

  get networkInfos(): NetworkInfo[] {
    return [...this._data.networkInfos]
  }

  get applications(): Application[] {
    return [...this._data.applications]
  }

  // ─── 业务规则检查 ────────────────────────────────────────────

  /**
   * 检查服务器是否在线
   */
  isOnline(): boolean {
    return this.status === 'running'
  }

  /**
   * 检查服务器是否可维护
   */
  canMaintain(): boolean {
    return this.status === 'running' || this.status === 'offline'
  }

  /**
   * 检查是否有关联应用
   */
  hasApplications(): boolean {
    return this._data.applications.length > 0
  }

  /**
   * 检查是否有关联网络信息
   */
  hasNetworkInfo(): boolean {
    return this._data.networkInfos.length > 0
  }

  /**
   * 获取主IP地址（第一个网卡的IP）
   */
  getPrimaryIp(): string | null {
    const primaryNic = this._data.networkInfos.find(n => n.nicPurpose === 'management')
    return primaryNic?.ipAddress || this._data.networkInfos[0]?.ipAddress || null
  }

  /**
   * 获取带外管理信息（从 Server 级别的 oobManagement 字段获取）
   */
  getOobManagement(): string | null {
    return this._data.oobManagement || null
  }

  // ─── 状态变更方法 ────────────────────────────────────────────

  /**
   * 启动服务器
   * @throws Error 如果服务器已在运行
   */
  async start(): Promise<void> {
    if (this.status === 'running') {
      throw new Error('服务器已在运行状态')
    }

    const oldStatus = this.status
    this._data.status = 'running'
    this._data.updatedAt = new Date()

    // 发布状态变更事件
    await serverEvents.statusChanged({
      serverId: this.id,
      name: this.name,
      oldStatus,
      newStatus: 'running',
      changedAt: new Date(),
    })
  }

  /**
   * 停止服务器
   * @throws Error 如果服务器已离线
   */
  async stop(): Promise<void> {
    if (this.status === 'offline') {
      throw new Error('服务器已处于离线状态')
    }

    const oldStatus = this.status
    this._data.status = 'offline'
    this._data.updatedAt = new Date()

    await serverEvents.statusChanged({
      serverId: this.id,
      name: this.name,
      oldStatus,
      newStatus: 'offline',
      changedAt: new Date(),
    })
  }

  /**
   * 进入维护模式
   * @throws Error 如果服务器已在维护中
   */
  async enterMaintenance(): Promise<void> {
    if (this.status === 'maintenance') {
      throw new Error('服务器已在维护模式')
    }

    const oldStatus = this.status
    this._data.status = 'maintenance'
    this._data.updatedAt = new Date()

    await serverEvents.statusChanged({
      serverId: this.id,
      name: this.name,
      oldStatus,
      newStatus: 'maintenance',
      changedAt: new Date(),
    })
  }

  // ─── 数据转换 ────────────────────────────────────────────────

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      company: this.company,
      status: this.status,
      model: this.model,
      sn: this.sn,
      cpu: this.cpu,
      memory: this.memory,
      disk: this.disk,
      os: this.os,
      datacenter: this.datacenter,
      cabinet: this.cabinet,
      owner: this.owner,
      onlineDate: this.onlineDate,
      networkInfos: this.networkInfos,
      applications: this.applications,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * 从Prisma数据创建领域实体
   */
  static fromPrisma(data: ServerData): Server {
    return new Server(data)
  }

  /**
   * 创建新服务器领域事件
   */
  static async emitCreated(data: ServerData): Promise<void> {
    await serverEvents.created({
      serverId: data.id,
      name: data.name,
      company: data.company,
      status: data.status as ServerStatus,
      createdAt: data.createdAt,
    })
  }

  /**
   * 创建更新事件
   */
  static async emitUpdated(
    serverId: number,
    name: string,
    changes: Record<string, { old: unknown; new: unknown }>
  ): Promise<void> {
    await serverEvents.updated({
      serverId,
      name,
      changes,
      updatedAt: new Date(),
    })
  }

  /**
   * 创建删除事件
   */
  static async emitDeleted(serverId: number, name: string): Promise<void> {
    await serverEvents.deleted({
      serverId,
      name,
      deletedAt: new Date(),
    })
  }
}
