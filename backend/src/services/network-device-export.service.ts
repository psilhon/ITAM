/**
 * 网络设备导出 Service
 * 支持 Excel 和 CSV 格式，按机房分 Sheet/分组
 */
import prisma from '../utils/prisma'

// 状态映射
const statusMap: Record<string, string> = {
  running: '运行中',
  offline: '已下线',
  maintenance: '维护中',
}

// 设备类型映射
const deviceTypeMap: Record<string, string> = {
  switch: '交换机',
  router: '路由器',
  firewall: '防火墙',
  lb: '负载均衡',
  other: '其他',
}

// 网络设备数据接口
interface NetworkDeviceData {
  id: number
  name: string
  deviceType: string
  brand: string | null
  model: string | null
  sn: string | null
  managementIp: string | null
  ports: string | null
  firmware: string | null
  datacenter: string | null
  datacenterPinyin: string | null
  cabinet: string | null
  rackUnit: string | null
  status: string
  onlineDate: string | null
  offlineDate: string | null
  owner: string | null
  remark: string | null
}

/**
 * 获取所有网络设备用于导出
 */
export async function getNetworkDevicesForExport(): Promise<NetworkDeviceData[]> {
  return prisma.networkDevice.findMany({
    orderBy: [{ datacenter: 'asc' }, { name: 'asc' }],
  }) as unknown as NetworkDeviceData[]
}

/**
 * 按机房分组网络设备数据
 */
export function groupNetworkDevicesByDatacenter(
  devices: NetworkDeviceData[]
): Record<string, NetworkDeviceData[]> {
  const grouped: Record<string, NetworkDeviceData[]> = {}
  for (const d of devices) {
    const key = d.datacenter?.trim() || '未分配机房'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(d)
  }
  return grouped
}

/**
 * 格式化网络设备数据为 Excel 行数据
 */
export function formatNetworkDeviceForExcel(
  device: NetworkDeviceData
): Record<string, string | number> {
  return {
    name: device.name,
    deviceType: deviceTypeMap[device.deviceType] || device.deviceType,
    brand: device.brand || '',
    model: device.model || '',
    sn: device.sn || '',
    managementIp: device.managementIp || '',
    ports: device.ports || '',
    firmware: device.firmware || '',
    datacenter: device.datacenter || '',
    cabinet: device.cabinet || '',
    rackUnit: device.rackUnit || '',
    status: statusMap[device.status] || device.status,
    onlineDate: device.onlineDate || '',
    offlineDate: device.offlineDate || '',
    owner: device.owner || '',
    remark: device.remark || '',
  }
}

/**
 * 格式化网络设备数据为 CSV 行数据
 */
export function formatNetworkDeviceForCsv(
  device: NetworkDeviceData
): (string | number)[] {
  return [
    device.id,
    device.name,
    deviceTypeMap[device.deviceType] || device.deviceType,
    device.brand || '',
    device.model || '',
    device.sn || '',
    device.managementIp || '',
    device.ports || '',
    device.firmware || '',
    device.datacenter || '',
    device.cabinet || '',
    device.rackUnit || '',
    statusMap[device.status] || device.status,
    device.onlineDate || '',
    device.offlineDate || '',
    device.owner || '',
    device.remark || '',
  ]
}

/**
 * Excel 导出配置
 */
export const excelExportConfig = {
  columns: [
    { header: '设备名称', key: 'name', width: 22 },
    { header: '设备类型', key: 'deviceType', width: 12 },
    { header: '品牌', key: 'brand', width: 14 },
    { header: '型号', key: 'model', width: 18 },
    { header: '序列号', key: 'sn', width: 20 },
    { header: '管理IP', key: 'managementIp', width: 18 },
    { header: '端口数', key: 'ports', width: 12 },
    { header: '固件版本', key: 'firmware', width: 16 },
    { header: '机房', key: 'datacenter', width: 14 },
    { header: '机柜', key: 'cabinet', width: 10 },
    { header: '机架位置', key: 'rackUnit', width: 10 },
    { header: '状态', key: 'status', width: 10 },
    { header: '上线日期', key: 'onlineDate', width: 12 },
    { header: '下线日期', key: 'offlineDate', width: 12 },
    { header: '资产归属', key: 'owner', width: 14 },
    { header: '备注', key: 'remark', width: 24 },
  ],
}

/**
 * CSV 导出配置
 */
export const csvExportConfig = {
  headers: [
    'ID',
    '设备名称',
    '设备类型',
    '品牌',
    '型号',
    '序列号',
    '管理IP',
    '端口数',
    '固件版本',
    '机房',
    '机柜',
    '机架位置',
    '状态',
    '上线日期',
    '下线日期',
    '资产归属',
    '备注',
  ],
}