import { Prisma, Server, NetworkInfo, Application } from '@prisma/client'
import prisma from '../utils/prisma'
import { BaseRepository } from './base.repository'
import { ServerQueryParams, PaginatedResult } from '../types'
import { getCompanyPinyin, getDatacenterPinyin } from '../utils/pinyin'

// 包含关联数据的Server类型
export type ServerWithRelations = Server & {
  networkInfos: NetworkInfo[]
  applications: Application[]
}

// 导出查询用的Include配置
export const SERVER_INCLUDE: Prisma.ServerInclude = {
  networkInfos: true,
  applications: true,
}

/**
 * Server Repository
 * 封装所有Server相关的数据访问逻辑
 */
export class ServerRepository extends BaseRepository<ServerWithRelations, Prisma.ServerCreateInput, Prisma.ServerUpdateInput, number> {
  /**
   * 构建搜索 where 条件
   */
  private buildWhere(params: ServerQueryParams): Prisma.ServerWhereInput {
    const { search, status, datacenter, owner, company } = params
    const where: Prisma.ServerWhereInput = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sn: { contains: search } },
        { model: { contains: search } },
        { company: { contains: search } },
        { owner: { contains: search } },
        { cpu: { contains: search } },
        { memory: { contains: search } },
        { disk: { contains: search } },
        { os: { contains: search } },
        { osManagement: { contains: search } },
        { oobManagement: { contains: search } },
        { remoteAccess: { contains: search } },
        { datacenter: { contains: search } },
        { cabinet: { contains: search } },
        { remark: { contains: search } },
        { networkInfos: { some: { ipAddress: { contains: search } } } },
        { networkInfos: { some: { nicName: { contains: search } } } },
        { applications: { some: { appName: { contains: search } } } },
      ]
    }
    
    if (status) where.status = status
    if (datacenter) where.datacenter = { contains: datacenter }
    if (owner) where.owner = { contains: owner }
    if (company) where.company = { contains: company }
    
    return where
  }

  /**
   * 根据ID查找服务器
   */
  async findById(id: number): Promise<ServerWithRelations | null> {
    return prisma.server.findUnique({
      where: { id },
      include: SERVER_INCLUDE,
    })
  }

  /**
   * 根据名称查找服务器（用于唯一性校验）
   */
  async findByName(name: string): Promise<ServerWithRelations | null> {
    return prisma.server.findUnique({
      where: { name },
      include: SERVER_INCLUDE,
    })
  }

  /**
   * 查找所有服务器
   */
  async findAll(): Promise<ServerWithRelations[]> {
    return prisma.server.findMany({
      include: SERVER_INCLUDE,
      orderBy: [{ company: 'asc' }, { name: 'asc' }],
    })
  }

  /**
   * 分页查询服务器
   */
  async findWithPagination(params: ServerQueryParams): Promise<PaginatedResult<ServerWithRelations>> {
    const { page = 1, pageSize = 20, sortBy, sortOrder = 'asc', ...filterParams } = params
    const skip = (page - 1) * pageSize
    const where = this.buildWhere(filterParams)

    // 构建排序
    const orderBy: Prisma.ServerOrderByWithRelationInput[] = []
    if (sortBy) {
      // 公司名称排序时改为按拼音排序（避免中文字符串 Unicode 顺序问题）
      if (sortBy === 'company') {
        orderBy.push({ companyPinyin: sortOrder })
        orderBy.push({ company: sortOrder }) // 拼音相同时按中文名排序
      } else {
        orderBy.push({ [sortBy]: sortOrder })
      }
    }
    // 默认按公司拼音首字母二次排序
    orderBy.push({ companyPinyin: 'asc' })
    orderBy.push({ company: 'asc' })
    // 主机名作为第三排序
    orderBy.push({ name: 'asc' })

    const [list, total] = await Promise.all([
      prisma.server.findMany({
        where,
        include: SERVER_INCLUDE,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.server.count({ where }),
    ])

    return { list, total, page, pageSize }
  }

  /**
   * 获取所有公司列表（去重，按拼音首字母升序）
   */
  async findCompanies(): Promise<string[]> {
    const result = await prisma.server.findMany({
      where: { company: { not: null } },
      select: { company: true, companyPinyin: true },
      distinct: ['company'],
      orderBy: [
        { companyPinyin: 'asc' },
        { company: 'asc' },
      ],
    })
    return result.map(r => r.company).filter(Boolean) as string[]
  }

  /**
   * 获取所有机房列表（去重，按拼音首字母升序）
   */
  async findDatacenters(company?: string): Promise<string[]> {
    const where: Prisma.ServerWhereInput = { datacenter: { not: null } }
    if (company) where.company = { contains: company }
    const result = await prisma.server.findMany({
      where,
      select: { datacenter: true, datacenterPinyin: true },
      distinct: ['datacenter'],
      orderBy: [
        { datacenterPinyin: 'asc' },
        { datacenter: 'asc' },
      ],
    })
    return result.map(r => r.datacenter).filter(Boolean) as string[]
  }

  /**
   * 获取所有资产归属列表（去重，按拼音首字母升序）
   */
  async findOwners(company?: string): Promise<string[]> {
    const where: Prisma.ServerWhereInput = { owner: { not: null } }
    if (company) where.company = { contains: company }
    const result = await prisma.server.findMany({
      where,
      select: { owner: true },
      distinct: ['owner'],
      orderBy: [
        { owner: 'asc' },
      ],
    })
    return result.map(r => r.owner).filter(Boolean) as string[]
  }

  /**
   * 获取用于导出的所有服务器（精简关联数据）
   */
  async findAllForExport(): Promise<(Server & { networkInfos: NetworkInfo[]; applications: Application[] })[]> {
    return prisma.server.findMany({
      include: { networkInfos: true, applications: true },
      orderBy: [{ companyPinyin: 'asc' }, { company: 'asc' }, { name: 'asc' }],
    })
  }

  /**
   * 创建服务器（自动计算拼音首字母）
   */
  async create(data: Prisma.ServerCreateInput): Promise<ServerWithRelations> {
    // 自动计算公司名称拼音首字母
    const company = data.company as string | undefined
    const companyPinyin = getCompanyPinyin(company)

    // 自动计算机房名称拼音首字母
    const datacenter = data.datacenter as string | undefined
    const datacenterPinyin = getDatacenterPinyin(datacenter)

    return prisma.server.create({
      data: {
        ...data,
        companyPinyin,
        datacenterPinyin,
      },
      include: SERVER_INCLUDE,
    })
  }

  /**
   * 更新服务器（自动更新拼音首字母）
   */
  async update(id: number, data: Prisma.ServerUpdateInput): Promise<ServerWithRelations | null> {
    try {
      // 如果更新了公司名称，重新计算拼音
      if (data.company !== undefined) {
        const company = data.company as string | null
        data.companyPinyin = company ? getCompanyPinyin(company) : null
      }
      // 如果更新了机房名称，重新计算拼音
      if (data.datacenter !== undefined) {
        const datacenter = data.datacenter as string | null
        data.datacenterPinyin = datacenter ? getDatacenterPinyin(datacenter) : null
      }

      return await prisma.server.update({
        where: { id },
        data,
        include: SERVER_INCLUDE,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null
      }
      throw error
    }
  }

  /**
   * 删除服务器
   */
  async delete(id: number): Promise<boolean> {
    try {
      await prisma.server.delete({ where: { id } })
      return true
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false
      }
      throw error
    }
  }

  /**
   * 批量删除服务器
   */
  async batchDelete(ids: number[]): Promise<number> {
    const result = await prisma.server.deleteMany({
      where: { id: { in: ids } },
    })
    return result.count
  }

  /**
   * 检查服务器是否存在
   */
  async exists(id: number): Promise<boolean> {
    const count = await prisma.server.count({ where: { id } })
    return count > 0
  }

  /**
   * 创建服务器（含关联数据：网络信息、应用信息）
   * 使用事务保证原子性——server + networkInfos + applications 同时成功或失败
   */
  async createWithRelations(data: {
    serverData: Prisma.ServerCreateInput
    networkInfos?: Array<Omit<Prisma.NetworkInfoCreateInput, 'server' | 'serverId'>>
    applications?: Array<Omit<Prisma.ApplicationCreateInput, 'server' | 'serverId'>>
  }): Promise<ServerWithRelations> {
    const { serverData, networkInfos, applications } = data

    return prisma.$transaction(async (tx) => {
      const server = await tx.server.create({
        data: {
          ...serverData,
          ...(networkInfos && networkInfos.length > 0
            ? { networkInfos: { create: networkInfos } }
            : {}),
          ...(applications && applications.length > 0
            ? { applications: { create: applications } }
            : {}),
        },
      })

      const created = await tx.server.findUnique({
        where: { id: server.id },
        include: SERVER_INCLUDE,
      })
      if (!created) throw new Error('服务器创建后查询失败')
      return created
    })
  }

  /**
   * 更新服务器（事务保证原子性）
   * 返回更新后的完整数据
   */
  async updateWithRelations(
    id: number,
    serverData: Prisma.ServerUpdateInput,
  ): Promise<ServerWithRelations | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 如果更新了公司名称，重新计算拼音
        if (serverData.company !== undefined) {
          const company = serverData.company as string | null
          serverData.companyPinyin = company ? getCompanyPinyin(company) : null
        }
        // 如果更新了机房名称，重新计算拼音
        if (serverData.datacenter !== undefined) {
          const datacenter = serverData.datacenter as string | null
          serverData.datacenterPinyin = datacenter ? getDatacenterPinyin(datacenter) : null
        }

        // 更新基础信息
        await tx.server.update({
          where: { id },
          data: serverData,
        })

        // 返回更新后的完整数据
        return tx.server.findUnique({
          where: { id },
          include: SERVER_INCLUDE,
        })
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null
      }
      throw error
    }
  }
}

// 导出单例实例
export const serverRepository = new ServerRepository()
