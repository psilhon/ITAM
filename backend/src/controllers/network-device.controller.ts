import { Request, Response } from 'express'
import * as networkDeviceService from '../services/network-device.service'
import { asyncHandler } from '../middleware/errorHandler'
import { createNetworkDeviceSchema, updateNetworkDeviceSchema } from '../validators'
import { ValidationError } from '../types'
import type { ParsedNetworkDevice } from '../services/network-device-import.service'

/**
 * 网络设备控制器
 */
export class NetworkDeviceController {
  /**
   * 获取网络设备列表（分页）
   */
  getNetworkDevices = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = '1',
      pageSize = '20',
      search,
      status,
      deviceType,
      datacenter,
      owner,
      sortBy,
      sortOrder,
    } = req.query as Record<string, string | undefined>

    const result = await networkDeviceService.getNetworkDeviceList({
      page: parseInt(page, 10),
      pageSize: Math.min(Math.max(parseInt(pageSize, 10), 1), 1000),
      search,
      status,
      deviceType,
      datacenter,
      owner,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    })

    res.json({ success: true, ...result })
  })

  /**
   * 获取单个网络设备
   */
  getNetworkDevice = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) throw new ValidationError('无效的设备 ID')

    const device = await networkDeviceService.getNetworkDeviceById(id)
    res.json({ success: true, data: device })
  })

  /**
   * 创建网络设备
   */
  createNetworkDevice = asyncHandler(async (req: Request, res: Response) => {
    const parsed = createNetworkDeviceSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message)
    }

    const device = await networkDeviceService.createNetworkDevice(parsed.data)
    res.json({ success: true, data: device })
  })

  /**
   * 更新网络设备
   */
  updateNetworkDevice = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) throw new ValidationError('无效的设备 ID')

    const parsed = updateNetworkDeviceSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message)
    }

    const device = await networkDeviceService.updateNetworkDevice(id, parsed.data)
    res.json({ success: true, data: device })
  })

  /**
   * 删除网络设备
   */
  deleteNetworkDevice = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) throw new ValidationError('无效的设备 ID')

    await networkDeviceService.deleteNetworkDevice(id)
    res.json({ success: true })
  })

  /**
   * 批量删除网络设备
   */
  batchDeleteNetworkDevices = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body as { ids: number[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('请提供要删除的设备 ID 列表')
    }

    const count = await networkDeviceService.batchDeleteNetworkDevices(ids)
    res.json({ success: true, data: { count } })
  })

  /**
   * 获取机房列表
   */
  getDatacenters = asyncHandler(async (_req: Request, res: Response) => {
    const datacenters = await networkDeviceService.getNetworkDeviceDatacenterList()
    res.json({ success: true, data: datacenters })
  })

  /**
   * 导出 Excel（按机房分 Sheet）
   */
  exportExcel = asyncHandler(async (_req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExcelJS = require('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'IT资产管理系统'
    workbook.created = new Date()

    const {
      getNetworkDevicesForExport,
      groupNetworkDevicesByDatacenter,
      formatNetworkDeviceForExcel,
      excelExportConfig,
    } = await import('../services/network-device-export.service')

    const allDevices = await getNetworkDevicesForExport()
    const grouped = groupNetworkDevicesByDatacenter(allDevices)

    const HEADER_STYLE = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0052D9' } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: false },
      border: {
        bottom: { style: 'thin', color: { argb: 'FFD0D7E8' } },
        right: { style: 'thin', color: { argb: 'FFD0D7E8' } },
      },
    }

    for (const [datacenter, list] of Object.entries(grouped)) {
      // 清理 Sheet 名称中的非法字符
      const sheetName = datacenter.replace(/[\\\/\?\*\[\]:]/g, '_').slice(0, 31)
      const ws = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 1 }],
        properties: { defaultRowHeight: 18 },
      })

      ws.columns = excelExportConfig.columns

      // 设置表头样式
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ws.getRow(1).eachCell((cell: any) => {
        Object.assign(cell, HEADER_STYLE)
      })
      ws.getRow(1).height = 22

      for (const device of list) {
        const rowData = formatNetworkDeviceForExcel(device)
        const row = ws.addRow(rowData)
        row.height = 18

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

      // 添加汇总行
      const summaryRow = ws.addRow({ name: `共 ${list.length} 台设备` })
      summaryRow.getCell('name').font = { bold: true, color: { argb: 'FF6B7A99' }, italic: true }
      summaryRow.height = 16
    }

    // 如果没有数据，添加一个空白 Sheet
    if (Object.keys(grouped).length === 0) {
      const ws = workbook.addWorksheet('网络设备', {
        views: [{ state: 'frozen', ySplit: 1 }],
      })
      ws.columns = excelExportConfig.columns
    }

    const filename = `网络设备资产_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    await workbook.xlsx.write(res)
    res.end()
  })

  /**
   * 导出 CSV（流式处理，支持 10000+ 条数据）
   */
  exportCsv = asyncHandler(async (_req: Request, res: Response) => {
    const { csvExportConfig } = await import('../services/network-device-export.service')
    const { formatNetworkDeviceForCsv } = await import('../services/network-device-export.service')
    const prisma = (await import('../utils/prisma')).default

    const BATCH_SIZE = 500
    const headers = csvExportConfig.headers

    // 设置响应头
    // 生成标准格式文件名
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const filename = `network-devices_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Transfer-Encoding', 'chunked')

    // 写入 BOM + 表头
    res.write('\uFEFF' + headers.map(h => `"${h}"`).join(',') + '\n')

    let cursor: number | undefined
    let totalWritten = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const devices = await prisma.networkDevice.findMany({
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [{ datacenter: 'asc' }, { name: 'asc' }],
      })

      if (devices.length === 0) break

      for (const device of devices) {
        const row = formatNetworkDeviceForCsv(device as any)
        const line = row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
        res.write(line + '\n')
        totalWritten++
      }

      cursor = devices[devices.length - 1].id

      // 小批次时结束
      if (devices.length < BATCH_SIZE) break
    }

    res.end()
    console.log(`[CSV Export] Completed: ${totalWritten} rows streamed`)
  })

  /**
   * 导入网络设备（支持 CSV 和 Excel）
   */
  importNetworkDevices = asyncHandler(async (req: Request, res: Response) => {
    const { content, format } = req.body as { content?: string; format?: 'csv' | 'xlsx' }

    if (!content || typeof content !== 'string') {
      throw new ValidationError('缺少文件内容')
    }

    // 文件大小校验（5MB = 5 * 1024 * 1024 字节）
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (content.length > MAX_FILE_SIZE) {
      throw new ValidationError('文件大小超过 5MB 限制')
    }

    const fileFormat = format || 'csv'

    let devices: ParsedNetworkDevice[]
    if (fileFormat === 'xlsx') {
      // 使用 xlsx 解析 Excel
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const XLSX = require('xlsx')
      const workbook = XLSX.read(Buffer.from(content, 'base64'), { type: 'base64' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!worksheet) {
        throw new ValidationError('Excel 文件中没有工作表')
      }

      // 将 Excel 数据转换为 JSON 数组
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

      if (jsonData.length < 2) {
        throw new ValidationError('Excel 文件为空或格式不正确')
      }

      const headers = (jsonData[0] as string[]).map(v => v?.toString().trim() || '')
      devices = []

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as string[]
        if (!row || row.length === 0 || row.every(v => !v)) continue

        const device: Record<string, string> = { name: '', lineNumber: String(i + 1) }
        for (let j = 0; j < headers.length && j < row.length; j++) {
          const value = row[j] || ''
          const fieldName = headers[j]
          // 字段名标准化
          const normalizedField = normalizeFieldName(fieldName)
          if (normalizedField && value) {
            device[normalizedField] = value
          }
        }
        if (device.name) {
          devices.push(device as unknown as ParsedNetworkDevice)
        }
      }
    } else {
      // CSV 解析（使用 csv-parser 流式 API）
      const { parseCsvContent } = await import('../services/network-device-import.service')
      devices = await parseCsvContent(content)
    }

    if (!devices || devices.length === 0) {
      throw new ValidationError('未能从文件中解析出任何网络设备数据，请确认文件格式正确')
    }

    const { importNetworkDevices: doImport } = await import('../services/network-device-import.service')
    const result = await doImport(devices)

    res.json({ success: true, data: result })
  })
}

function normalizeFieldName(name: string): string {
  const FIELD_NAME_MAP: Record<string, string> = {
    '设备名称': 'name', 'name': 'name',
    '设备类型': 'deviceType', 'deviceType': 'deviceType',
    '品牌': 'brand', 'brand': 'brand',
    '型号': 'model', 'model': 'model',
    '序列号': 'sn', 'sn': 'sn',
    '管理IP': 'managementIp', 'managementIp': 'managementIp',
    '端口数': 'ports', 'ports': 'ports',
    '固件版本': 'firmware', 'firmware': 'firmware',
    '机房': 'datacenter', 'datacenter': 'datacenter',
    '机柜': 'cabinet', 'cabinet': 'cabinet',
    '机架位置': 'rackUnit', 'rackUnit': 'rackUnit',
    '状态': 'status', 'status': 'status',
    '上线日期': 'onlineDate', 'onlineDate': 'onlineDate',
    '下线日期': 'offlineDate', 'offlineDate': 'offlineDate',
    '资产归属': 'owner', 'owner': 'owner',
    '备注': 'remark', 'remark': 'remark',
  }
  return FIELD_NAME_MAP[name.trim()] || name.trim()
}

export const networkDeviceController = new NetworkDeviceController()
