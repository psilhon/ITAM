import { Prisma, Application } from '@prisma/client'
import prisma from '../utils/prisma'
import { BaseRepository } from './base.repository'

/**
 * Application Repository
 * 封装所有Application相关的数据访问逻辑
 */
export class ApplicationRepository extends BaseRepository<Application, Prisma.ApplicationCreateInput, Prisma.ApplicationUpdateInput, number> {
  /**
   * 根据ID查找应用信息
   */
  async findById(id: number): Promise<Application | null> {
    return prisma.application.findUnique({ where: { id } })
  }

  /**
   * 查找所有应用信息
   */
  async findAll(): Promise<Application[]> {
    return prisma.application.findMany({
      orderBy: { id: 'desc' },
    })
  }

  /**
   * 根据服务器ID查找应用信息
   */
  async findByServerId(serverId: number): Promise<Application[]> {
    return prisma.application.findMany({
      where: { serverId },
      orderBy: { id: 'desc' },
    })
  }

  /**
   * 创建应用信息
   */
  async create(data: Prisma.ApplicationCreateInput): Promise<Application> {
    return prisma.application.create({ data })
  }

  /**
   * 更新应用信息
   */
  async update(id: number, data: Prisma.ApplicationUpdateInput): Promise<Application | null> {
    try {
      return await prisma.application.update({
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
   * 删除应用信息
   */
  async delete(id: number): Promise<boolean> {
    try {
      await prisma.application.delete({ where: { id } })
      return true
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false
      }
      throw error
    }
  }

  /**
   * 检查应用信息是否存在
   */
  async exists(id: number): Promise<boolean> {
    const count = await prisma.application.count({ where: { id } })
    return count > 0
  }

  /**
   * 根据应用名称查找
   */
  async findByAppName(appName: string): Promise<Application[]> {
    return prisma.application.findMany({
      where: { appName: { contains: appName } },
      orderBy: { id: 'desc' },
    })
  }
}

// 导出单例实例
export const applicationRepository = new ApplicationRepository()
