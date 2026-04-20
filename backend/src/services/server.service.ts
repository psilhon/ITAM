/**
 * Server Service
 * 纯业务逻辑层，所有数据访问委托给 Repository
 */
import { Prisma } from '@prisma/client'
import { serverRepository, ServerWithRelations } from '../repositories/server.repository'
import { validateOrThrow, createServerSchema, updateServerSchema } from '../validators'
import { ServerQueryParams, PaginatedResult } from '../types'

// ─── 类型定义 ────────────────────────────────────────────────

interface CreateServerInput {
  networkInfos?: unknown[]
  applications?: unknown[]
  [key: string]: unknown
}

interface UpdateServerInput {
  [key: string]: unknown
}

// ─── 查询 ────────────────────────────────────────────────────

export async function getCompanyList(): Promise<string[]> {
  return serverRepository.findCompanies()
}

export async function getDatacenterList(company?: string): Promise<string[]> {
  return serverRepository.findDatacenters(company)
}

export async function getOwnerList(company?: string): Promise<string[]> {
  return serverRepository.findOwners(company)
}

export async function getServerList(params: ServerQueryParams): Promise<PaginatedResult<ServerWithRelations>> {
  return serverRepository.findWithPagination(params)
}

export async function getServerById(id: number): Promise<ServerWithRelations | null> {
  return serverRepository.findById(id)
}

export async function getServerAllForExport() {
  return serverRepository.findAllForExport()
}

// ─── 写入 ────────────────────────────────────────────────────

/**
 * 创建服务器（含关联数据）
 */
export async function createServer(rawData: unknown) {
  // Schema 校验（已包含关联数据校验）
  const data = validateOrThrow(createServerSchema, rawData)

  // 名称唯一性校验
  const { name } = data as { name: string }
  const existing = await serverRepository.findByName(name)
  if (existing) {
    const err: any = new Error(`服务器名称「${name}」已存在，请使用其他名称`)
    err.statusCode = 409
    throw err
  }

  const { networkInfos, applications, ...serverData } = data as CreateServerInput

  return serverRepository.createWithRelations({
    serverData: serverData as Prisma.ServerCreateInput,
    networkInfos: (networkInfos as Array<Record<string, unknown>>)?.map((n) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { server: _s, serverId: _si, ...rest } = n as any
      return rest
    }) as unknown as Array<Omit<Prisma.NetworkInfoCreateInput, 'server' | 'serverId'>>,
    applications: (applications as Array<Record<string, unknown>>)?.map((a) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { server: _s, serverId: _si, ...rest } = a as any
      return rest
    }) as unknown as Array<Omit<Prisma.ApplicationCreateInput, 'server' | 'serverId'>>,
  })
}

// 可选字符串字段列表：空字符串不覆盖数据库已有值
// name 和 status 是必填字段，不在保护范围内
const OPTIONAL_STRING_FIELDS = [
  'company', 'brand', 'model', 'sn', 'cpu', 'cpuCores', 'logicalCores',
  'cpuArch', 'memory', 'memoryModules', 'disk', 'diskType', 'os', 'osKernel',
  'osManagement', 'oobManagement', 'remoteAccess', 'routeInfo', 'nicModel',
  'datacenter', 'cabinet', 'rackUnit', 'owner', 'remark',
  'onlineDate', 'offlineDate',
] as const

/**
 * 更新服务器
 * 防止前端编辑时用空字符串覆盖数据库中已有的可选字段值
 */
export async function updateServer(id: number, rawData: unknown) {
  // Schema 校验（不校验关联数据，由关联接口处理）
  const data = validateOrThrow(updateServerSchema, rawData)

  // 过滤空字符串：可选字段为空时从 data 中移除，让 Prisma 跳过更新
  // 这样前端编辑提交空值不会清空数据库中已有的值
  const dataRecord = data as Record<string, unknown>
  for (const field of OPTIONAL_STRING_FIELDS) {
    if (dataRecord[field] === '') {
      delete dataRecord[field]
    }
  }

  // 名称唯一性校验（如果改了 name）
  const { name } = data as { name?: string }
  if (name) {
    const existing = await serverRepository.findByName(name)
    if (existing && existing.id !== id) {
      const err: any = new Error(`服务器名称「${name}」已存在，请使用其他名称`)
      err.statusCode = 409
      throw err
    }
  }

  return serverRepository.updateWithRelations(
    id,
    data as Prisma.ServerUpdateInput,
  )
}

/**
 * 删除服务器
 */
export async function deleteServer(id: number): Promise<void> {
  const deleted = await serverRepository.delete(id)
  if (!deleted) {
    const err: any = new Error('服务器不存在')
    err.statusCode = 404
    throw err
  }
}

/**
 * 批量删除服务器（由 Controller 层校验上限）
 */
export async function batchDeleteServers(ids: number[]): Promise<number> {
  return serverRepository.batchDelete(ids)
}
