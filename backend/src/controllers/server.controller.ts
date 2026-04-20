import { Request, Response } from 'express'
import * as serverService from '../services/server.service'
import { parseCollectFile, importServers } from '../services/import.service'
import { asyncHandler } from '../middleware/errorHandler'
import { setAuditContext } from '../middleware/audit'
import { NotFoundError, ValidationError } from '../types'
import { ServerQueryParams } from '../types'

/**
 * 服务器控制器
 * 处理 HTTP 请求/响应，调用 Service 层业务逻辑
 */
export class ServerController {
  /**
   * 获取公司名称列表
   */
  getCompanies = asyncHandler(async (_req: Request, res: Response) => {
    const companies = await serverService.getCompanyList()
    res.json({ success: true, data: companies })
  })

  /**
   * 获取机房名称列表（支持按公司筛选）
   */
  getDatacenters = asyncHandler(async (req: Request, res: Response) => {
    const { company } = req.query as { company?: string }
    const datacenters = await serverService.getDatacenterList(company)
    res.json({ success: true, data: datacenters })
  })

  /**
   * 获取资产归属列表（支持按公司筛选）
   */
  getOwners = asyncHandler(async (req: Request, res: Response) => {
    const { company } = req.query as { company?: string }
    const owners = await serverService.getOwnerList(company)
    res.json({ success: true, data: owners })
  })

  /**
   * 获取服务器列表（支持分页、筛选、搜索、排序）
   */
  getServers = asyncHandler(async (req: Request, res: Response) => {
    const { 
      page = '1', 
      pageSize = '20', 
      search, 
      status, 
      datacenter, 
      owner, 
      company,
      sortBy,
      sortOrder,
    } = req.query as Record<string, string | undefined>

    const params: ServerQueryParams = {
      page: parseInt(page, 10),
      pageSize: Math.min(Math.max(parseInt(pageSize, 10), 1), 1000), // 上限1000条，防止内存耗尽
      search,
      status: status as ServerQueryParams['status'],
      datacenter,
      owner,
      company,
      sortBy: sortBy as ServerQueryParams['sortBy'],
      sortOrder: sortOrder as ServerQueryParams['sortOrder'],
    }

    const result = await serverService.getServerList(params)
    res.json({ success: true, data: result })
  })

  /**
   * 获取单个服务器详情
   */
  getServerById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError('无效的 ID 参数')
    }

    const server = await serverService.getServerById(id)
    if (!server) {
      throw new NotFoundError('服务器不存在')
    }

    res.json({ success: true, data: server })
  })

  /**
   * 创建服务器
   */
  createServer = asyncHandler(async (req: Request, res: Response) => {
    const body = JSON.parse(JSON.stringify(req.body), (_k, v) => v === null ? '' : v)
    const server = await serverService.createServer(body)
    res.status(201).json({ success: true, data: server })
  })

  /**
   * 更新服务器（记录变更前后状态）
   */
  updateServer = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError('无效的 ID 参数')
    }

    // 将 body 中所有 null 转为空字符串，避免 Prisma NOT NULL 约束报错
    const body = JSON.parse(JSON.stringify(req.body), (_k, v) => v === null ? '' : v)

    // 记录变更前的状态（用于审计 diff）
    const before = await serverService.getServerById(id)
    if (!before) {
      throw new NotFoundError('服务器不存在')
    }
    setAuditContext(req, {
      before: before as unknown as Record<string, unknown>,
      entityName: 'Server',
    })

    const server = await serverService.updateServer(id, body)
    setAuditContext(req, {
      before: before as unknown as Record<string, unknown>,
      after: server as unknown as Record<string, unknown>,
      entityName: 'Server',
    })
    res.json({ success: true, data: server })
  })

  /**
   * 删除服务器（记录删除前状态）
   */
  deleteServer = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError('无效的 ID 参数')
    }

    // 记录删除前的状态（用于审计）
    const before = await serverService.getServerById(id)
    if (before) {
      setAuditContext(req, {
        before: before as unknown as Record<string, unknown>,
        entityName: 'Server',
      })
    }

    await serverService.deleteServer(id)
    res.json({ success: true, message: '删除成功' })
  })

  /**
   * 批量删除服务器
   */
  batchDeleteServers = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body as { ids: number[] }
    // 记录将要删除的数量（不记录具体 ID，防止敏感信息泄露）
    setAuditContext(req, {
      entityName: 'Server',
    })
    await serverService.batchDeleteServers(ids)
    res.json({ success: true, message: `成功删除 ${ids.length} 台服务器` })
  })

  /**
   * 导入资产（解析文本文件，按主机名 upsert）
   */
  importServers = asyncHandler(async (req: Request, res: Response) => {
    const { content } = req.body as { content: string }
    if (!content || typeof content !== 'string') {
      throw new ValidationError('缺少文件内容')
    }

    const parsed = parseCollectFile(content)
    if (parsed.length === 0) {
      throw new ValidationError('未能从文件中解析出任何服务器数据，请确认文件格式正确')
    }

    const result = await importServers(parsed)
    res.json({ success: true, data: result })
  })

  /**
   * 导出服务器列表为 Excel（包含完整网络信息和应用信息）
   */
  exportExcel = asyncHandler(async (_req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExcelJS = require('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = '服务器资产管理系统'
    workbook.created = new Date()

    // 使用ExportService获取和处理数据
    const { getServersForExport, groupServersByCompany, formatServerForExcel, excelExportConfig } = await import('../services/export.service')
    const allServers = await getServersForExport()
    const grouped = groupServersByCompany(allServers)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const HEADER_STYLE: any = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052D9' } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: false },
      border: {
        bottom: { style: 'thin', color: { argb: 'FFD0D7E8' } },
        right: { style: 'thin', color: { argb: 'FFD0D7E8' } },
      },
    }

    for (const [company, list] of Object.entries(grouped)) {
      const sheetName = company.replace(/[\\\/\?\*\[\]:]/g, '_').slice(0, 31)
      const ws = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 1 }],
        properties: { defaultRowHeight: 18 },
      })

      // 使用Service层配置的列定义
      ws.columns = excelExportConfig.columns

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ws.getRow(1).eachCell((cell: any) => {
        Object.assign(cell, HEADER_STYLE)
      })
      ws.getRow(1).height = 22

      for (const s of list) {
        const rowData = formatServerForExcel(s)
        const row = ws.addRow(rowData)

        // 设置行高（根据网络/应用数量）
        const maxItems = Math.max(
          s.networkInfos?.length || 1,
          s.applications?.length || 1
        )
        row.height = Math.max(18, maxItems * 16)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.border = {
            bottom: { style: 'hair', color: { argb: 'FFE8ECF5' } },
            right: { style: 'hair', color: { argb: 'FFE8ECF5' } },
          }
          cell.alignment = { vertical: 'top', wrapText: true }
          if (row.number % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FC' } }
          }
        })
      }

      const summaryRow = ws.addRow({ name: `共 ${list.length} 台服务器` })
      summaryRow.getCell('name').font = { bold: true, color: { argb: 'FF6B7A99' }, italic: true }
      summaryRow.height = 16
    }

    const filename = `服务器资产_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    await workbook.xlsx.write(res)
    res.end()
  })

  /**
   * 导出服务器列表为 CSV（流式处理，支持 10000+ 条数据）
   * 使用 cursor 分批查询，避免全量加载到内存
   */
  exportCsv = asyncHandler(async (_req: Request, res: Response) => {
    const { csvExportConfig } = await import('../services/export.service')
    const prisma = (await import('../utils/prisma')).default

    const BATCH_SIZE = 500
    const headers = csvExportConfig.headers

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="servers-${Date.now()}.csv"`)
    res.setHeader('Transfer-Encoding', 'chunked')

    // 写入 BOM + 表头
    res.write('\uFEFF' + headers.map(h => `"${h}"`).join(',') + '\n')

    let cursor: number | undefined
    let totalWritten = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const servers = await prisma.server.findMany({
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        include: { networkInfos: true, applications: true },
        orderBy: [{ company: 'asc' }, { name: 'asc' }],
      })

      if (servers.length === 0) break

      for (const server of servers) {
        const { formatServerForCsv } = await import('../services/export.service')
        const row = formatServerForCsv(server as any)
        const line = row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
        res.write(line + '\n')
        totalWritten++
      }

      cursor = servers[servers.length - 1].id

      // 小批次时 flush，让客户端开始下载
      if (servers.length < BATCH_SIZE) break
    }

    res.end()
    console.log(`[CSV Export] Completed: ${totalWritten} rows streamed`)
  })
}

// 导出单例实例
export const serverController = new ServerController()
