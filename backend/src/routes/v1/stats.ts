import { Router, Request, Response } from 'express'
import prisma from '../../utils/prisma'

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
      totalNetworkDevices,
      runningNetworkDevices,
      offlineNetworkDevices,
    ] = await Promise.all([
      prisma.server.count(),
      prisma.server.count({ where: { status: 'running' } }),
      prisma.server.count({ where: { status: 'offline' } }),
      prisma.server.count({ where: { status: 'maintenance' } }),
      prisma.application.count(),
      prisma.application.count({ where: { status: 'running' } }),
      prisma.networkDevice.count(),
      prisma.networkDevice.count({ where: { status: 'running' } }),
      prisma.networkDevice.count({ where: { status: 'offline' } }),
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
          totalNetworkDevices,
          runningNetworkDevices,
          offlineNetworkDevices,
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

export default router
