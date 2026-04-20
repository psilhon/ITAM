/**
 * 高级资产导入 Service
 * 支持同时导入多个文件，支持多种格式，统一不区分大小写匹配
 */
import prisma from '../utils/prisma'
import { parseCollectFile, ParsedServer, ImportResult } from './import.service'
import { getCompanyPinyin, getDatacenterPinyin } from '../utils/pinyin'

// ─── 导入文件类型定义 ──────────────────────────────────────────────

export interface ImportFile {
  filename: string
  content: string
  type: 'server' | 'network-device' | 'auto' // 文件类型
}

export interface MultiFileImportResult {
  files: {
    filename: string
    type: string
    status: 'success' | 'partial' | 'failed'
    result: ImportResult
  }[]
  summary: {
    totalFiles: number
    successFiles: number
    partialFiles: number
    failedFiles: number
    totalServers: number
    totalCreated: number
    totalUpdated: number
    totalSkipped: number
  }
}

// ─── 批量服务器导入（支持多文件） ──────────────────────────────────

/**
 * 批量导入多个文件中的服务器数据
 * 统一使用不区分大小写匹配
 */
export async function batchImportServers(
  files: ImportFile[]
): Promise<MultiFileImportResult> {
  const fileResults: MultiFileImportResult['files'] = []
  
  // 预处理：收集所有待导入的服务器
  const allParsedServers: ParsedServer[] = []
  const fileServerMap = new Map<string, ParsedServer[]>() // 文件名 -> 解析出的服务器
  
  for (const file of files) {
    try {
      const parsedServers = parseCollectFile(file.content)
      fileServerMap.set(file.filename, parsedServers)
      allParsedServers.push(...parsedServers)
    } catch (error: any) {
      fileResults.push({
        filename: file.filename,
        type: file.type,
        status: 'failed' as const,
        result: {
          total: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: [`文件解析失败: ${error.message}`],
          details: [],
        } as ImportResult,
      })
    }
  }
  
  if (allParsedServers.length === 0) {
    return {
      files: fileResults,
      summary: {
        totalFiles: files.length,
        successFiles: 0,
        partialFiles: 0,
        failedFiles: fileResults.length,
        totalServers: 0,
        totalCreated: 0,
        totalUpdated: 0,
        totalSkipped: 0,
      },
    }
  }
  
  // ── 批量查询阶段：一次性获取所有已存在的服务器（不区分大小写匹配） ─────────────────
  // 将所有待导入名称转为小写进行匹配
  const namesLower = allParsedServers.map(s => s.name.toLowerCase())
  const uniqueNamesLower = [...new Set(namesLower)]
  
  // SQLite 区分大小写，查询所有服务器然后过滤匹配小写名称的
  const allServers = await prisma.server.findMany({
    include: { networkInfos: true },
  })
  
  // 使用小写键构建 Map，实现不区分大小写的匹配
  const existingMap = new Map<string, typeof allServers[0]>()
  for (const server of allServers) {
    const key = server.name.toLowerCase()
    if (uniqueNamesLower.includes(key)) {
      existingMap.set(key, server)
    }
  }
  
  // ── 按文件批量导入 ───────────────────────────────────────────
  for (const [filename, parsedServers] of fileServerMap.entries()) {
    const result: ImportResult = {
      total: parsedServers.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      details: [],
    }
    
    try {
      // ── 分离新建和更新 ───────────────────────────────────────────
      const toCreate: ParsedServer[] = []
      const toUpdate: Array<{ parsed: ParsedServer; existing: typeof allServers[0] }> = []
      
      for (const parsed of parsedServers) {
        // 使用小写键查找，实现不区分大小写匹配
        const existing = existingMap.get(parsed.name.toLowerCase())
        if (existing) {
          toUpdate.push({ parsed, existing })
        } else {
          toCreate.push(parsed)
        }
      }
      
      // ── 批量新建服务器 ─────────────────────────────────────────
      if (toCreate.length > 0) {
        // 预计算所有拼音（批量）
        const companyPinyins = new Map<string, string | null>()
        const datacenterPinyins = new Map<string, string | null>()
        for (const s of toCreate) {
          if (s.company && !companyPinyins.has(s.company)) {
            companyPinyins.set(s.company, getCompanyPinyin(s.company))
          }
          if (s.datacenter && !datacenterPinyins.has(s.datacenter)) {
            datacenterPinyins.set(s.datacenter, getDatacenterPinyin(s.datacenter))
          }
        }
        
        // 批量创建服务器（服务器 + 网卡在同一事务中，任一失败全部回滚）
        const serverCreates = toCreate.map(parsed => ({
          name: parsed.name,
          company: parsed.company || null,
          datacenter: parsed.datacenter || null,
          companyPinyin: companyPinyins.get(parsed.company || '') ?? null,
          datacenterPinyin: datacenterPinyins.get(parsed.datacenter || '') ?? null,
          brand: parsed.brand || null,
          model: parsed.model || null,
          sn: parsed.sn || null,
          cpu: parsed.cpu || null,
          cpuCores: parsed.cpuCores || null,
          logicalCores: parsed.logicalCores || null,
          cpuArch: parsed.cpuArch || null,
          memory: parsed.memory || null,
          memoryModules: parsed.memoryModules || null,
          disk: parsed.disk || null,
          diskType: parsed.diskType || null,
          os: parsed.os || null,
          osKernel: parsed.osKernel || null,
          routeInfo: parsed.routeInfo || null,
          nicModel: parsed.nicModel || null,
          status: 'running' as const,
        }))

        await prisma.$transaction(async (tx) => {
          await tx.server.createMany({ data: serverCreates })

          // 批量获取新建的服务器 ID（用于后续创建网卡）
          const newServers = await tx.server.findMany({
            where: { name: { in: toCreate.map(s => s.name) } },
          })
          const newServerMap = new Map(newServers.map(s => [s.name, s]))

          // 批量创建网卡
          const allNicCreates: Array<{ serverId: number; nicName: string; ipAddress: string | null }> = []
          for (const parsed of toCreate) {
            const srv = newServerMap.get(parsed.name)
            if (!srv) continue
            for (const nic of parsed.networkInfos) {
              allNicCreates.push({
                serverId: srv.id,
                nicName: nic.nicName,
                ipAddress: nic.ipAddress || null,
              })
            }
          }
          if (allNicCreates.length > 0) {
            await tx.networkInfo.createMany({ data: allNicCreates })
          }
        })

        result.created += toCreate.length
        for (const s of toCreate) {
          result.details.push({ name: s.name, lineNumber: s.lineNumber, action: 'created' })
        }
      }
      
      // ── 批量更新服务器 + 网卡 ────────────────────────────────────
      for (const { parsed, existing } of toUpdate) {
        try {
          // 计算需要更新的字段（只覆盖空字段）
          const updateData: Record<string, unknown> = {}
          const setIfAbsent = (field: string, value: unknown) => {
            if (value && !existing[field as keyof typeof existing]) {
              updateData[field] = value
            }
          }
          setIfAbsent('brand', parsed.brand)
          setIfAbsent('model', parsed.model)
          setIfAbsent('sn', parsed.sn)
          setIfAbsent('cpu', parsed.cpu)
          setIfAbsent('cpuCores', parsed.cpuCores)
          setIfAbsent('logicalCores', parsed.logicalCores)
          setIfAbsent('cpuArch', parsed.cpuArch)
          setIfAbsent('memory', parsed.memory)
          setIfAbsent('memoryModules', parsed.memoryModules)
          setIfAbsent('disk', parsed.disk)
          setIfAbsent('diskType', parsed.diskType)
          setIfAbsent('os', parsed.os)
          setIfAbsent('osKernel', parsed.osKernel)
          setIfAbsent('routeInfo', parsed.routeInfo)
          setIfAbsent('nicModel', parsed.nicModel)
          
          if (Object.keys(updateData).length > 0) {
            await prisma.server.update({
              where: { id: existing.id },
              data: updateData,
            })
          }
          
          // 更新网卡信息（按 nicName upsert）
          for (const nic of parsed.networkInfos) {
            const existingNic = existing.networkInfos.find(
              n => n.nicName === nic.nicName
            )
            if (existingNic) {
              if (!existingNic.ipAddress && nic.ipAddress) {
                await prisma.networkInfo.update({
                  where: { id: existingNic.id },
                  data: { ipAddress: nic.ipAddress },
                })
              }
            } else {
              await prisma.networkInfo.create({
                data: {
                  serverId: existing.id,
                  nicName: nic.nicName,
                  ipAddress: nic.ipAddress || null,
                },
              })
            }
          }
          
          result.updated++
          result.details.push({ name: parsed.name, lineNumber: parsed.lineNumber, action: 'updated' })
        } catch (err: any) {
          result.skipped++
          const lineInfo = parsed.lineNumber ? ` (第${parsed.lineNumber}行)` : ''
          result.errors.push(`[${parsed.name}${lineInfo}]: ${err.message}`)
          result.details.push({
            name: parsed.name,
            lineNumber: parsed.lineNumber,
            action: 'skipped',
            error: err.message,
          })
        }
      }
      
      // 确定文件导入状态
      const hasErrors = result.errors.length > 0
      const hasSuccess = result.created + result.updated > 0
      const status = hasErrors 
        ? (hasSuccess ? 'partial' : 'failed') 
        : 'success'
      
      fileResults.push({
        filename,
        type: 'server',
        status,
        result,
      })
      
    } catch (error: any) {
      fileResults.push({
        filename,
        type: 'server',
        status: 'failed',
        result: {
          total: parsedServers.length,
          created: 0,
          updated: 0,
          skipped: parsedServers.length,
          errors: [`文件处理失败: ${error.message}`],
          details: parsedServers.map(s => ({
            name: s.name,
            lineNumber: s.lineNumber,
            action: 'skipped',
            error: error.message,
          })),
        } as ImportResult,
      })
    }
  }
  
  // 计算汇总统计
  const summary = {
    totalFiles: files.length,
    successFiles: fileResults.filter(f => f.status === 'success').length,
    partialFiles: fileResults.filter(f => f.status === 'partial').length,
    failedFiles: fileResults.filter(f => f.status === 'failed').length,
    totalServers: allParsedServers.length,
    totalCreated: fileResults.reduce((sum, f) => sum + f.result.created, 0),
    totalUpdated: fileResults.reduce((sum, f) => sum + f.result.updated, 0),
    totalSkipped: fileResults.reduce((sum, f) => sum + f.result.skipped, 0),
  }
  
  return {
    files: fileResults,
    summary,
  }
}