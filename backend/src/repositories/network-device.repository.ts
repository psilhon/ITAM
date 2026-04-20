import { Prisma, NetworkDevice } from '@prisma/client'
import prisma from '../utils/prisma'
import { BaseRepository } from './base.repository'
import { PaginatedResult } from '../types'

export type NetworkDeviceWithRelations = NetworkDevice

export const NETWORK_DEVICE_INCLUDE = {}

export class NetworkDeviceRepository extends BaseRepository<NetworkDeviceWithRelations, Prisma.NetworkDeviceCreateInput, Prisma.NetworkDeviceUpdateInput, number> {
  private buildWhere(params: {
    search?: string
    status?: string
    deviceType?: string
    datacenter?: string
    owner?: string
  }): Prisma.NetworkDeviceWhereInput {
    const { search, status, deviceType, datacenter, owner } = params
    const where: Prisma.NetworkDeviceWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sn: { contains: search } },
        { model: { contains: search } },
        { brand: { contains: search } },
        { managementIp: { contains: search } },
        { datacenter: { contains: search } },
        { cabinet: { contains: search } },
        { owner: { contains: search } },
        { remark: { contains: search } },
      ]
    }

    if (status) where.status = status
    if (deviceType) where.deviceType = deviceType
    if (datacenter) where.datacenter = { contains: datacenter }
    if (owner) where.owner = { contains: owner }

    return where
  }

  async findById(id: number): Promise<NetworkDeviceWithRelations | null> {
    return prisma.networkDevice.findUnique({ where: { id } })
  }

  async findByName(name: string): Promise<NetworkDeviceWithRelations | null> {
    return prisma.networkDevice.findUnique({ where: { name } })
  }

  async findAll(): Promise<NetworkDeviceWithRelations[]> {
    return prisma.networkDevice.findMany({
      orderBy: [{ datacenter: 'asc' }, { name: 'asc' }],
    })
  }

  async findWithPagination(params: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    deviceType?: string
    datacenter?: string
    owner?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResult<NetworkDeviceWithRelations>> {
    const { page = 1, pageSize = 20, sortBy, sortOrder = 'asc', ...filterParams } = params
    const skip = (page - 1) * pageSize
    const where = this.buildWhere(filterParams)

    const orderBy: Prisma.NetworkDeviceOrderByWithRelationInput[] = []
    if (sortBy) {
      orderBy.push({ [sortBy]: sortOrder })
    }
    orderBy.push({ datacenter: 'asc' })
    orderBy.push({ name: 'asc' })

    const [list, total] = await Promise.all([
      prisma.networkDevice.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.networkDevice.count({ where }),
    ])

    return { list, total, page, pageSize }
  }

  async findDatacenters(): Promise<string[]> {
    const result = await prisma.networkDevice.findMany({
      where: { datacenter: { not: null } },
      select: { datacenter: true },
      distinct: ['datacenter'],
      orderBy: { datacenter: 'asc' },
    })
    return result.map(r => r.datacenter).filter(Boolean) as string[]
  }

  async create(data: Prisma.NetworkDeviceCreateInput): Promise<NetworkDeviceWithRelations> {
    return prisma.networkDevice.create({ data })
  }

  async update(id: number, data: Prisma.NetworkDeviceUpdateInput): Promise<NetworkDeviceWithRelations | null> {
    try {
      return await prisma.networkDevice.update({ where: { id }, data })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null
      }
      throw error
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      await prisma.networkDevice.delete({ where: { id } })
      return true
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false
      }
      throw error
    }
  }

  async batchDelete(ids: number[]): Promise<number> {
    const result = await prisma.networkDevice.deleteMany({
      where: { id: { in: ids } },
    })
    return result.count
  }

  async exists(id: number): Promise<boolean> {
    const count = await prisma.networkDevice.count({ where: { id } })
    return count > 0
  }
}

export const networkDeviceRepository = new NetworkDeviceRepository()
