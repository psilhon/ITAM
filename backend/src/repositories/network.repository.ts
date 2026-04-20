import { Prisma, NetworkInfo } from '@prisma/client'
import prisma from '../utils/prisma'
import { BaseRepository } from './base.repository'

/**
 * Network Repository
 * 封装所有NetworkInfo相关的数据访问逻辑
 */
export class NetworkRepository extends BaseRepository<NetworkInfo, Prisma.NetworkInfoCreateInput, Prisma.NetworkInfoUpdateInput, number> {
  /**
   * 根据ID查找网络信息
   */
  async findById(id: number): Promise<NetworkInfo | null> {
    return prisma.networkInfo.findUnique({ where: { id } })
  }

  /**
   * 查找所有网络信息
   */
  async findAll(): Promise<NetworkInfo[]> {
    return prisma.networkInfo.findMany({
      orderBy: { id: 'desc' },
    })
  }

  /**
   * 根据服务器ID查找网络信息
   */
  async findByServerId(serverId: number): Promise<NetworkInfo[]> {
    return prisma.networkInfo.findMany({
      where: { serverId },
      orderBy: { id: 'desc' },
    })
  }

  /**
   * 创建网络信息
   */
  async create(data: Prisma.NetworkInfoCreateInput): Promise<NetworkInfo> {
    return prisma.networkInfo.create({ data })
  }

  /**
   * 更新网络信息
   */
  async update(id: number, data: Prisma.NetworkInfoUpdateInput): Promise<NetworkInfo | null> {
    try {
      return await prisma.networkInfo.update({
        where: { id },
        data,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null
      }
      throw error
    }
  }

  /**
   * 删除网络信息
   */
  async delete(id: number): Promise<boolean> {
    try {
      await prisma.networkInfo.delete({ where: { id } })
      return true
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false
      }
      throw error
    }
  }

  /**
   * 检查网络信息是否存在
   */
  async exists(id: number): Promise<boolean> {
    const count = await prisma.networkInfo.count({ where: { id } })
    return count > 0
  }

  /**
   * 检查IP地址是否已被使用
   */
  async isIpAddressUsed(ipAddress: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.NetworkInfoWhereInput = { ipAddress }
    if (excludeId) {
      where.id = { not: excludeId }
    }
    const count = await prisma.networkInfo.count({ where })
    return count > 0
  }
}

// 导出单例实例
export const networkRepository = new NetworkRepository()
