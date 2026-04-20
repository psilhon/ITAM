import { Router, Request, Response } from 'express'
import prisma from '../utils/prisma'

const router = Router()

// 仪表盘统计数据
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [
      totalServers,
      runningServers,
      offlineServers,
      maintenanceServers,
      totalApps,
      runningApps,
    ] = await Promise.all([
      prisma.server.count(),
      prisma.server.count({ where: { status: 'running' } }),
      prisma.server.count({ where: { status: 'offline' } }),
      prisma.server.count({ where: { status: 'maintenance' } }),
      prisma.application.count(),
      prisma.application.count({ where: { status: 'running' } }),
    ])

    // 按机房统计
    const datacenterStats = await prisma.server.groupBy({
      by: ['datacenter'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    // 按操作系统统计
    const osStats = await prisma.server.groupBy({
      by: ['os'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    // 按资产归属统计（Top 5）
    const ownerStats = await prisma.server.groupBy({
      by: ['owner'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })

    // 最近添加的服务器
    const recentServers = await prisma.server.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, status: true, datacenter: true, owner: true, createdAt: true },
    })

    res.json({
      success: true,
      data: {
        overview: {
          total: totalServers,
          running: runningServers,
          offline: offlineServers,
          maintenance: maintenanceServers,
          totalApps,
          runningApps,
        },
        datacenterStats: datacenterStats.map(d => ({
          name: d.datacenter || '未知',
          value: d._count.id,
        })),
        osStats: osStats.slice(0, 6).map(o => ({
          name: o.os || '未知',
          value: o._count.id,
        })),
        ownerStats: ownerStats.map(o => ({
          name: o.owner || '未知',
          value: o._count.id,
        })),
        recentServers,
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 汇总管理服务器的硬件资源规格
router.get('/system', async (_req: Request, res: Response) => {
  try {
    // 从数据库中取出所有服务器的基础硬件信息（仅 running 状态的服务器）
    const servers = await prisma.server.findMany({
      where: { status: 'running' },
      select: { cpuCores: true, memory: true, disk: true },
    })

    // 聚合 CPU 核心数（memoryModules 累加）
    let totalCores = 0
    let totalMemory = 0
    let totalDisk = 0

    for (const s of servers) {
      if (s.cpuCores) {
        const cores = parseInt(s.cpuCores)
        if (!isNaN(cores)) totalCores += cores
      }
      if (s.memory) totalMemory += parseMemoryToBytes(s.memory)
      if (s.disk) totalDisk += parseMemoryToBytes(s.disk)
    }

    res.json({
      success: true,
      data: {
        serverCount: servers.length,
        cpu: { cores: totalCores },
        memory: { total: totalMemory },
        disk: { total: totalDisk },
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

/** 解析内存/磁盘字符串为字节数，如 "64GB" -> 68719476736 */
function parseMemoryToBytes(value: string): number {
  if (!value) return 0
  const match = value.match(/^([\d.]+)\s*(B|KB|MB|GB|TB|K|M|G|T)?$/i)
  if (!match) return 0
  const num = parseFloat(match[1])
  const unit = (match[2] || 'B').toUpperCase()
  const units: Record<string, number> = {
    'B': 1, 'K': 1024, 'KB': 1024, 'M': 1024 ** 2, 'MB': 1024 ** 2,
    'G': 1024 ** 3, 'GB': 1024 ** 3, 'T': 1024 ** 4, 'TB': 1024 ** 4,
  }
  return Math.round(num * (units[unit] || 1))
}

export default router
