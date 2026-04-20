/**
 * Network 充血领域模型
 * 封装网络信息的业务规则
 */

import { NetworkInfo as PrismaNetworkInfo } from '@prisma/client'
import { NicPurpose } from '../../types'

export type NetworkData = PrismaNetworkInfo

/**
 * Network 领域实体
 */
export class Network {
  private _data: NetworkData

  constructor(data: NetworkData) {
    this._data = data
  }

  // ─── Getters ─────────────────────────────────────────────────

  get id(): number { return this._data.id }
  get serverId(): number { return this._data.serverId }
  get nicName(): string { return this._data.nicName }
  get ipAddress(): string | null { return this._data.ipAddress }
  get nicPurpose(): NicPurpose | null { return this._data.nicPurpose as NicPurpose | null }
  get remark(): string | null { return this._data.remark }
  get createdAt(): Date { return this._data.createdAt }
  get updatedAt(): Date { return this._data.updatedAt }

  // ─── 业务规则检查 ────────────────────────────────────────────

  /** 检查是否为管理网卡 */
  isManagementNic(): boolean { return this.nicPurpose === 'management' }
  /** 检查是否为业务网卡 */
  isBusinessNic(): boolean { return this.nicPurpose === 'business' }
  /** 检查是否为BMC网卡 */
  isBmcNic(): boolean { return this.nicPurpose === 'bmc' }
  /** 检查是否为交易网卡 */
  isTradingNic(): boolean { return this.nicPurpose === 'trading' }
  /** 检查是否为行情网卡 */
  isMarketNic(): boolean { return this.nicPurpose === 'market' }
  /** 检查是否有IP地址 */
  hasIpAddress(): boolean { return !!this.ipAddress }

  /**
   * 验证IP地址格式（支持 CIDR 如 192.168.1.2/24）
   */
  static isValidIpAddress(ip: string): boolean {
    // 支持带 CIDR 后缀
    const ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[12][0-9]|3[0-2]))?$/
    return ipv4CidrRegex.test(ip)
  }

  // ─── 数据转换 ────────────────────────────────────────────────

  /** 转换为JSON对象 */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      serverId: this.serverId,
      nicName: this.nicName,
      ipAddress: this.ipAddress,
      nicPurpose: this.nicPurpose,
      remark: this.remark,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /** 从Prisma数据创建领域实体 */
  static fromPrisma(data: NetworkData): Network {
    return new Network(data)
  }
}
