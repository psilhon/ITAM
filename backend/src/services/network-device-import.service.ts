/**
 * 网络设备导入 Service
 * 支持 CSV 和 Excel 格式，按设备名称 upsert
 */
import prisma from '../utils/prisma'
import { validateOrThrow } from '../validators'
import { z } from 'zod'

// 设备类型枚举
const DEVICE_TYPES = ['switch', 'router', 'firewall', 'lb', 'other'] as const
// 状态枚举
const STATUSES = ['running', 'offline', 'maintenance'] as const

// 导入结果接口
export interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// 解析后的单条网络设备数据
export interface ParsedNetworkDevice {
  name: string
  deviceType?: string
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
  lineNumber?: number
}

// 导入记录
interface ImportRecord {
  name: string
  lineNumber?: number
  action: 'created' | 'updated' | 'skipped'
  error?: string
}

/**
 * 验证设备类型枚举值
 */
function validateDeviceType(value: unknown): string | null {
  if (value && DEVICE_TYPES.includes(value as typeof DEVICE_TYPES[number])) {
    return value as string
  }
  return null
}

/**
 * 验证状态枚举值
 */
function validateStatus(value: unknown): string | null {
  if (value && STATUSES.includes(value as typeof STATUSES[number])) {
    return value as string
  }
  return null
}

/**
 * 字段名标准化映射（支持中英文）
 */
const FIELD_NAME_MAP: Record<string, string> = {
  '设备名称': 'name',
  'name': 'name',
  '设备类型': 'deviceType',
  'deviceType': 'deviceType',
  'devicetype': 'deviceType',
  '品牌': 'brand',
  'brand': 'brand',
  '型号': 'model',
  'model': 'model',
  '序列号': 'sn',
  'sn': 'sn',
  'serialNumber': 'sn',
  '管理IP': 'managementIp',
  'managementIp': 'managementIp',
  'management_ip': 'managementIp',
  '端口数': 'ports',
  'ports': 'ports',
  '固件版本': 'firmware',
  'firmware': 'firmware',
  '机房': 'datacenter',
  'datacenter': 'datacenter',
  '机柜': 'cabinet',
  'cabinet': 'cabinet',
  '机架位置': 'rackUnit',
  'rackUnit': 'rackUnit',
  'rack_unit': 'rackUnit',
  '状态': 'status',
  'status': 'status',
  '上线日期': 'onlineDate',
  'onlineDate': 'onlineDate',
  '上线时间': 'onlineDate',
  '下线日期': 'offlineDate',
  'offlineDate': 'offlineDate',
  '下线时间': 'offlineDate',
  '资产归属': 'owner',
  'owner': 'owner',
  '备注': 'remark',
  'remark': 'remark',
}

/**
 * 标准化字段名
 */
function normalizeFieldName(name: string): string {
  return FIELD_NAME_MAP[name.trim()] || name.trim()
}

/**
 * 解析 CSV 内容（使用 csv-parser 库流式 API）
 */
export function parseCsvContent(content: string): Promise<ParsedNetworkDevice[]> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const csv = require('csv-parser')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Readable } = require('stream')

  const results: ParsedNetworkDevice[] = []

  // 将字符串内容转换为可读流
  const stream = Readable.from([content])

  return new Promise((resolve, reject) => {
    let lineNumber = 0

    stream
      .pipe(csv())
      .on('headers', (headers: string[]) => {
        // 标准化表头
        // csv-parser 会自动处理引号和转义
      })
      .on('data', (row: Record<string, string>) => {
        lineNumber++
        const device: ParsedNetworkDevice = {
          name: row.name || row['设备名称'] || '',
          lineNumber,
          deviceType: row.deviceType || row['设备类型'] || undefined,
          brand: row.brand || row['品牌'] || undefined,
          model: row.model || row['型号'] || undefined,
          sn: row.sn || row['序列号'] || row.serialNumber || undefined,
          managementIp: row.managementIp || row['管理IP'] || row.management_ip || undefined,
          ports: row.ports || row['端口数'] || undefined,
          firmware: row.firmware || row['固件版本'] || undefined,
          datacenter: row.datacenter || row['机房'] || undefined,
          cabinet: row.cabinet || row['机柜'] || undefined,
          rackUnit: row.rackUnit || row['机架位置'] || row.rack_unit || undefined,
          status: row.status || row['状态'] || undefined,
          onlineDate: row.onlineDate || row['上线日期'] || row['上线时间'] || undefined,
          offlineDate: row.offlineDate || row['下线日期'] || row['下线时间'] || undefined,
          owner: row.owner || row['资产归属'] || undefined,
          remark: row.remark || row['备注'] || undefined,
        }

        if (device.name) {
          results.push(device)
        }
      })
      .on('end', () => {
        resolve(results)
      })
      .on('error', (err: Error) => {
        reject(err)
      })
  })
}

/**
 * 导入网络设备（upsert 策略）
 * @param devices 解析后的设备列表
 * @returns 导入结果统计
 */
export async function importNetworkDevices(
  devices: ParsedNetworkDevice[]
): Promise<ImportResult> {
  const result: ImportResult = {
    total: devices.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  // 批量事务处理
  const BATCH_SIZE = 100

  for (let i = 0; i < devices.length; i += BATCH_SIZE) {
    const batch = devices.slice(i, i + BATCH_SIZE)

    await prisma.$transaction(async (tx) => {
      for (const device of batch) {
        const record = await processDevice(tx, device)

        if (record.action === 'created') result.created++
        else if (record.action === 'updated') result.updated++
        else result.skipped++

        if (record.error) {
          result.errors.push(record.error)
        }
      }
    })
  }

  return result
}

/**
 * 处理单条设备导入
 */
async function processDevice(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  device: ParsedNetworkDevice
): Promise<ImportRecord> {
  const { name, lineNumber, ...rest } = device

  // 验证必填字段
  if (!name || name.trim() === '') {
    return {
      name: name || '(空)',
      lineNumber,
      action: 'skipped',
      error: `第${lineNumber}行: 设备名称不能为空`,
    }
  }

  // 验证设备类型枚举
  if (rest.deviceType && !validateDeviceType(rest.deviceType)) {
    return {
      name,
      lineNumber,
      action: 'skipped',
      error: `第${lineNumber}行: 设备类型"${rest.deviceType}"无效，有效值为: ${DEVICE_TYPES.join(', ')}`,
    }
  }

  // 验证状态枚举
  if (rest.status && !validateStatus(rest.status)) {
    return {
      name,
      lineNumber,
      action: 'skipped',
      error: `第${lineNumber}行: 状态"${rest.status}"无效，有效值为: ${STATUSES.join(', ')}`,
    }
  }

  // 检查是否存在（不区分大小写精确匹配）
  const nameLower = name.trim().toLowerCase()
  // 批量查询后手动匹配，实现不区分大小写
  const existingDevices = await tx.networkDevice.findMany()
  // 手动进行不区分大小写匹配
  const existing = existingDevices.find(d => d.name.toLowerCase() === nameLower) || null

  if (existing) {
    // 更新：只更新空字段
    const updateData: Record<string, string> = {}
    const fields: (keyof typeof rest)[] = [
      'brand', 'model', 'sn', 'managementIp', 'ports', 'firmware',
      'datacenter', 'cabinet', 'rackUnit', 'status', 'onlineDate',
      'offlineDate', 'owner', 'remark',
    ]

    for (const field of fields) {
      const value = rest[field]
      if (value !== undefined && value !== null && value !== '') {
        // 只更新空字段
        if (!existing[field as keyof typeof existing] || existing[field as keyof typeof existing] === '') {
          updateData[field] = value
        }
      }
    }

    // 更新设备类型（如果提供了有效值且当前为空）
    if (rest.deviceType && (!existing.deviceType || existing.deviceType === '')) {
      updateData.deviceType = rest.deviceType
    }

    if (Object.keys(updateData).length > 0) {
      await tx.networkDevice.update({
        where: { id: existing.id },
        data: updateData,
      })
      return { name, lineNumber, action: 'updated' }
    }

    return { name, lineNumber, action: 'skipped' }
  } else {
    // 新建
    const createData: Record<string, string> = {
      name: name.trim(),
    }

    if (rest.deviceType) createData.deviceType = rest.deviceType
    if (rest.brand) createData.brand = rest.brand
    if (rest.model) createData.model = rest.model
    if (rest.sn) createData.sn = rest.sn
    if (rest.managementIp) createData.managementIp = rest.managementIp
    if (rest.ports) createData.ports = rest.ports
    if (rest.firmware) createData.firmware = rest.firmware
    if (rest.datacenter) createData.datacenter = rest.datacenter
    if (rest.cabinet) createData.cabinet = rest.cabinet
    if (rest.rackUnit) createData.rackUnit = rest.rackUnit
    if (rest.status) createData.status = rest.status
    else createData.status = 'running' // 默认状态
    if (rest.onlineDate) createData.onlineDate = rest.onlineDate
    if (rest.offlineDate) createData.offlineDate = rest.offlineDate
    if (rest.owner) createData.owner = rest.owner
    if (rest.remark) createData.remark = rest.remark

    await tx.networkDevice.create({
      data: createData as unknown as Parameters<typeof tx.networkDevice.create>[0]['data'],
    })

    return { name, lineNumber, action: 'created' }
  }
}