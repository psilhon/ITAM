import { NetworkDevice } from '@prisma/client'
import { networkDeviceRepository, NetworkDeviceWithRelations } from '../repositories/network-device.repository'
import { PaginatedResult } from '../types'
import { ConflictError, NotFoundError } from '../types'

/**
 * 获取网络设备列表（分页）
 */
export async function getNetworkDeviceList(params: {
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
  return networkDeviceRepository.findWithPagination(params)
}

/**
 * 获取所有网络设备（不分页，用于下拉列表）
 */
export async function getAllNetworkDevices(): Promise<NetworkDevice[]> {
  return networkDeviceRepository.findAll()
}

/**
 * 获取单个网络设备
 */
export async function getNetworkDeviceById(id: number): Promise<NetworkDevice> {
  const device = await networkDeviceRepository.findById(id)
  if (!device) throw new NotFoundError(`网络设备 #${id} 不存在`)
  return device
}

/**
 * 创建网络设备
 */
export async function createNetworkDevice(data: {
  name: string
  deviceType: string
  brand?: string
  model?: string
  sn?: string
  managementIp?: string
  ports?: string
  firmware?: string
  datacenter?: string
  cabinet?: string
  rackUnit?: string
  status?: string
  onlineDate?: string
  offlineDate?: string
  owner?: string
  remark?: string
}): Promise<NetworkDevice> {
  // 名称唯一性检查
  const existing = await networkDeviceRepository.findByName(data.name)
  if (existing) throw new ConflictError(`设备名称「${data.name}」已存在`)

  return networkDeviceRepository.create(data as any)
}

/**
 * 更新网络设备
 */
export async function updateNetworkDevice(
  id: number,
  data: Partial<{
    name: string
    deviceType: string
    brand: string
    model: string
    sn: string
    managementIp: string
    ports: string
    firmware: string
    datacenter: string
    cabinet: string
    rackUnit: string
    status: string
    onlineDate: string
    offlineDate: string
    owner: string
    remark: string
  }>
): Promise<NetworkDevice> {
  const existing = await networkDeviceRepository.exists(id)
  if (!existing) throw new NotFoundError(`网络设备 #${id} 不存在`)

  // 如果改名称，检查唯一性
  if (data.name) {
    const byName = await networkDeviceRepository.findByName(data.name)
    if (byName && byName.id !== id) {
      throw new ConflictError(`设备名称「${data.name}」已存在`)
    }
  }

  const updated = await networkDeviceRepository.update(id, data as any)
  if (!updated) throw new NotFoundError(`网络设备 #${id} 不存在`)
  return updated
}

/**
 * 删除网络设备
 */
export async function deleteNetworkDevice(id: number): Promise<void> {
  const deleted = await networkDeviceRepository.delete(id)
  if (!deleted) throw new NotFoundError(`网络设备 #${id} 不存在`)
}

/**
 * 批量删除网络设备
 */
export async function batchDeleteNetworkDevices(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0
  if (ids.length > 100) throw new Error('单次最多删除 100 台设备')
  return networkDeviceRepository.batchDelete(ids)
}

/**
 * 获取机房列表
 */
export async function getNetworkDeviceDatacenterList(): Promise<string[]> {
  return networkDeviceRepository.findDatacenters()
}
