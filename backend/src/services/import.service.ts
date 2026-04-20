/**
 * 资产导入 Service
 * 解析 SeverCollect.txt 格式文件，按主机名 upsert 服务器数据
 */
import prisma from '../utils/prisma'
import { createServerSchema, updateServerSchema } from '../validators'
import { validateOrThrow } from '../validators'
import { getCompanyPinyin, getDatacenterPinyin } from '../utils/pinyin'

// ─── 解析后的单条服务器数据 ────────────────────────────────

export interface ParsedServer {
  name: string          // 主机名
  company?: string      // 公司名称
  datacenter?: string   // 机房
  brand?: string        // 品牌
  model?: string        // 型号
  sn?: string           // 序列号
  cpu?: string          // CPU型号
  cpuCores?: string     // 物理核心数（如 "2"）
  logicalCores?: string // 逻辑核心数（如 "40"）
  cpuArch?: string      // CPU架构（如 "x86_64"）
  memory?: string       // 总内存（如 "256G"）
  memoryModules?: string // 内存模块（如 "32G×8"）
  disk?: string         // 磁盘容量（如 "2.6T"）
  diskType?: string     // 磁盘类型（如 "SSD"）
  os?: string           // 操作系统
  osKernel?: string     // 内核版本
  networkInfos: Array<{
    nicName: string
    ipAddress?: string
  }>
  routeInfo?: string    // 网卡关联路由信息（多行文本，已过滤 Unknown）
  nicModel?: string     // 网卡硬件型号（品牌/芯片组，lspci 输出）
  lineNumber?: number   // 在文件中的起始行号
}

// ─── 导入结果 ──────────────────────────────────────────────

export interface ImportResult {
  total: number        // 文件中服务器总数
  created: number      // 新建数量
  updated: number      // 更新数量
  skipped: number      // 跳过数量（解析失败的）
  errors: string[]     // 错误信息（含行号）
  details: Array<{
    name: string
    lineNumber?: number
    action: 'created' | 'updated' | 'skipped'
    error?: string
  }>
}

// ─── 文本解析 ──────────────────────────────────────────────

/**
 * 解析 SeverCollect.txt 格式文件
 * 文件以 === 分隔多个服务器条目，每个条目内以 "字段名: 值" 格式存储
 */
export function parseCollectFile(content: string): ParsedServer[] {
  // 计算每个 block 的起始行号
  const lines = content.split('\n')
  const lineOffsets: number[] = [0] // 记录每个 === 分隔的起始行号（0-based）
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/={30,}/)) {
      lineOffsets.push(i + 1) // 下一个 block 从下一行开始
    }
  }

  // 按 === 分隔多个服务器段落
  const blocks = content.split(/={30,}/).map(b => b.trim()).filter(Boolean)
  const servers: ParsedServer[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const lineNumber = (lineOffsets[i] || 0) + 1 // 转换为 1-based 行号

    // 必须包含主机名
    const nameMatch = block.match(/主机名[：:]\s*(.+)/)
    if (!nameMatch) continue

    const name = nameMatch[1].trim()
    if (!name) continue

    const server: ParsedServer = {
      name,
      networkInfos: [],
      lineNumber,
    }

    // 公司名称
    const companyMatch = block.match(/公司名称[：:]\s*(.+)/)
    if (companyMatch) server.company = companyMatch[1].trim()

    // 机房
    const datacenterMatch = block.match(/机房[：:]\s*(.+)/)
    if (datacenterMatch) server.datacenter = datacenterMatch[1].trim()

    // 品牌
    const brandMatch = block.match(/品牌[：:]\s*(.+)/)
    if (brandMatch) server.brand = brandMatch[1].trim()

    // 型号
    const modelMatch = block.match(/型号[：:]\s*(.+)/)
    if (modelMatch) server.model = modelMatch[1].trim()

    // 序列号
    const snMatch = block.match(/序列号[：:]\s*(.+)/)
    if (snMatch) server.sn = snMatch[1].trim()

    // 操作系统：优先从"CentOS完整版本描述"提取完整版本（如 "Red Hat Enterprise Linux Server 7.9 (Maipo)"），其次从版本号提取
    // 注意：字段名可能被 ** 或 * 包裹，如 **CentOS完整版本描述**: ...
    const osDescMatch = block.match(/[*#]*\s*CentOS完整版本描述[*#]*[：:]\s*(.+)/)
    if (osDescMatch) {
      server.os = osDescMatch[1].trim()
    } else {
      const osNameMatch = block.match(/发行版名称[：:]\s*(.+)/)
      if (osNameMatch) server.os = osNameMatch[1].trim()
    }

    // 内核版本
    const kernelMatch = block.match(/内核版本[：:]\s*(.+)/)
    if (kernelMatch) server.osKernel = kernelMatch[1].trim()

    // CPU型号（完整行，如 "型号: Intel(R) Xeon(R) Gold 6242R CPU @ 3.10GHz"）
    const cpuMatch = block.match(/(型号[：:]\s*Intel.*|型号[：:]\s*AMD.*)/i)
    if (cpuMatch) server.cpu = cpuMatch[1].trim()

    // 物理核心数
    const coresMatch = block.match(/物理核心数[：:]\s*(\d+)/)
    if (coresMatch) server.cpuCores = coresMatch[1].trim()

    // 逻辑核心数（兼容 "逻辑核心数/线程数: 96" 和 "逻辑核心数: 96" 两种格式）
    const logicalMatch = block.match(/逻辑核心数(?:\/线程数)?[：:]\s*(\d+)/)
    if (logicalMatch) server.logicalCores = logicalMatch[1].trim()

    // CPU架构
    const archMatch = block.match(/架构[：:]\s*(x86_64|x64|amd64|aarch64|arm64|i[356]86|386)/i)
    if (archMatch) server.cpuArch = archMatch[1].trim()

    // 总内存（如 "256G"，兼容 "总内存:" 和 "总物理容量:" 两种格式）
    const memMatch = block.match(/总(?:物理)?容量[：:]\s*([0-9.]+[A-Za-z]+)/)
    if (memMatch) server.memory = memMatch[1].trim()

    // 内存模块（单条容量×数量，如 "32G×8"，兼容"单条内存容量"/"单条容量"+"内存数量"/"内存条数量"）
    const memSizeMatch = block.match(/单条(?:内存)?容量[：:]\s*([0-9.]+[A-Za-z]+)/)
    const memCountMatch = block.match(/(?:内存|内存条)数量[：:]\s*(\d+)/)
    if (memSizeMatch && memCountMatch) {
      server.memoryModules = `${memSizeMatch[1].trim()}×${memCountMatch[1].trim()}`
    } else if (memSizeMatch) {
      server.memoryModules = memSizeMatch[1].trim()
    }

    // 磁盘容量：优先匹配显式字段，其次从设备列表第一块物理盘提取
    // 格式1: "磁盘容量: 2.6T"
    // 格式2: "sda  1.1T  disk"
    // 格式3: "设备: /dev/sda | 品牌: ... | 容量: 3.5T | 类型: ..."
    const diskMatch = block.match(/磁盘容量[：:]\s*([0-9.]+[A-Za-z]+)/)
    if (diskMatch) {
      server.disk = diskMatch[1].trim()
    } else {
      // 尝试匹配 "sda  1.1T  disk" 格式
      const diskDeviceMatch = block.match(/(?:^|\n)(sda|nvme\d+n\d+|vda|hda)[^\n]*?\s+([0-9.]+[A-Za-z]+)\s+disk\b/)
      if (diskDeviceMatch) {
        server.disk = diskDeviceMatch[2].trim()
      } else {
        // 尝试匹配 "设备: /dev/sda | ... | 容量: 3.5T | 类型: ..." 格式
        const capacityMatch = block.match(/设备:\s*\/dev\/(?:sda|nvme\d+n\d+|vda|hda)[^\n]*?容量[：:]\s*([0-9.]+[A-Za-z]+)/)
        if (capacityMatch) server.disk = capacityMatch[1].trim()
      }
    }

    // 磁盘类型：优先从"磁盘类型"字段匹配，其次从物理硬盘详情中提取
    // 格式1: "磁盘类型: SSD"
    // 格式2: "类型: 固态硬盘(SSD)" 或 "类型: 机械硬盘(HDD)"
    const diskTypeMatch = block.match(/磁盘类型[：:]\s*(.+)/)
    if (diskTypeMatch) {
      server.diskType = diskTypeMatch[1].trim()
    } else {
      // 提取 "类型: 固态硬盘(SSD)" 中的 SSD
      const physicalMatch = block.match(/类型[：:]\s*[^,，|]*(?:SSD|HDD)[^,，|]*/i)
      if (physicalMatch) {
        server.diskType = physicalMatch[0].includes('SSD') ? 'SSD' : 'HDD'
      }
    }

    // ── 网卡关联路由信息（精密解析）────────────────────────────
    // 截取从"网卡关联路由信息"标题到下一个"---"分隔或文件末尾的内容
    // 注意：block 已经是 split 后的内容，内部不再包含 === 分隔符
    const routeInfoMatch = block.match(/----------------\s*网卡关联路由信息[\s-]*\n([\s\S]+?)(?=\n\s*-{16,}\s*\n|$)/)
    if (routeInfoMatch) {
      const raw = routeInfoMatch[1]
      const routeLines: string[] = []
      let currentNic: string | null = null
      let routeEntryLines: string[] = []
      let inGatewaySection = false

      for (const rawLine of raw.split('\n')) {
        const l = rawLine.trim()
        if (!l) continue

        // 1) 网卡路由条目标题（如 ">> 网卡 **team0** 的路由条目:"）
        const entryHeader = l.match(/^>>\s*网卡\s+\*\*(.+?)\*\*\s*的路由条目[：:]\s*$/)
        if (entryHeader) {
          // 输出上一张网卡的路由（忽略全 Unknown 的情况）
          if (currentNic && routeEntryLines.length > 0) {
            const hasNonUnknown = routeEntryLines.some(
              rl => rl.trim().toLowerCase() !== 'unknown'
            )
            if (hasNonUnknown) {
              routeLines.push(...routeEntryLines)
            }
          }
          currentNic = entryHeader[1]
          routeEntryLines = []
          inGatewaySection = false
          continue
        }

        // 2) 默认网关段落：跳过标题行，后续行也不作路由处理
        if (l === '>> 默认网关:' || l.startsWith('>> 默认网关')) {
          inGatewaySection = true
          continue
        }
        if (inGatewaySection) continue

        // 3) 说明行 / 分隔行：跳过
        if (l.startsWith('说明') || l.startsWith('--')) continue

        // 4) 真正的路由行：必须是 default 或包含 CIDR 前缀的完整路由
        //    跳过单独的 "10.209.8.254"（默认网关 IP，不是路由）
        if (l.match(/^default\s+\S|^\d+\.\d+\.\d+\.\d+\/\d+|^\d+\.\d+\.\d+\.\d+\s+via\s/)) {
          routeEntryLines.push(l)
        }
      }

      // 处理最后一张网卡的路由
      if (currentNic && routeEntryLines.length > 0) {
        const hasNonUnknown = routeEntryLines.some(
          rl => rl.trim().toLowerCase() !== 'unknown'
        )
        if (hasNonUnknown) routeLines.push(...routeEntryLines)
      }

      if (routeLines.length > 0) server.routeInfo = routeLines.join('\n')
    }

    // ── 网卡硬件型号（品牌/芯片组）─────────────────────────────
    // 提取 lspci 格式的网卡硬件信息（以 PCI 总线地址开头，如 "04:00.0 Ethernet controller: ..."）
    // 格式: ">> 网卡硬件型号（品牌/芯片组）:" 后跟多行 PCI 信息
    // 结束条件：遇到下一个 "---" 分隔行或文件末尾
    const nicModelMatch = block.match(/>>\s*网卡硬件型号[^\n]*\n([\s\S]+?)(?=\n\s*-{10,}\s*\n|$)/)
    if (nicModelMatch) {
      const hwLines = nicModelMatch[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => {
          // 只保留 PCI 总线地址开头的行（形如 "04:00.0 ..."）
          return /^\d{2}:\d{2}\.\d\s/.test(l)
        })
      if (hwLines.length > 0) {
        server.nicModel = hwLines.join('\n')
      }
    }

    // 网卡/IP 信息（兼容两种格式：网卡: eth0  地址: 10.x.x.x 和 网卡: eth0  IP: 10.x.x.x）
    const nicSectionMatch = block.match(/>> IP地址信息[^\n]*\n([\s\S]*?)(?=(?:>>|----)|={30,}|$)/)
    if (nicSectionMatch) {
      const nicLines = nicSectionMatch[1].split('\n').filter(l => l.includes('网卡'))
      for (const line of nicLines) {
        const nicNameMatch = line.match(/网卡[：:]\s*(\S+)/)
        // 同时兼容 "地址: X" 和 "IP: X" 两种格式
        const ipMatch = line.match(/(?:地址|IP)[：:]\s*([\d./]+)/)
        if (nicNameMatch) {
          server.networkInfos.push({
            nicName: nicNameMatch[1].trim(),
            ipAddress: ipMatch ? ipMatch[1].trim() : undefined,
          })
        }
      }
    }

    servers.push(server)
  }

  return servers
}

// ─── 批量导入 ──────────────────────────────────────────────

/**
 * 按主机名 upsert 服务器列表
 * - 主机名存在 → 更新已有字段（字段为空时补充）
 * - 主机名不存在 → 新建
 */
export async function importServers(
  parsedServers: ParsedServer[]
): Promise<ImportResult> {
  const result: ImportResult = {
    total: parsedServers.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: [],
  }

  // ── 批量查询阶段：一次性获取所有已存在的服务器（不区分大小写匹配） ─────────────────
  // 将所有待导入名称转为小写进行匹配
  const namesLower = parsedServers.map(s => s.name.toLowerCase())
  const uniqueNamesLower = [...new Set(namesLower)]
  
  // SQLite 区分大小写，使用原始查询实现不区分大小写匹配
  // 查询所有服务器，然后过滤匹配小写名称的
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

  return result
}
