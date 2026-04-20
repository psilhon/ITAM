import { Prisma } from '@prisma/client'
import prisma from '../utils/prisma'
import { sanitizeExcelCell } from '../utils/sanitize'

// 状态映射
const statusMap: Record<string, string> = {
  running: '运行中',
  offline: '已下线',
  maintenance: '维护中',
}

const appStatusMap: Record<string, string> = {
  running: '运行中',
  stopped: '已停止',
  error: '异常',
}

const appTypeMap: Record<string, string> = {
  web: 'Web服务',
  database: '数据库',
  middleware: '中间件',
  cache: '缓存服务',
  futures_trading: '期货交易',
  stock_trading: '股票交易',
  data_related: '数据相关',
  other: '其他',
}

// 应用信息接口
interface ApplicationData {
  appName: string
  appType: string | null
  status: string
  deployPath: string | null
  remark: string | null
}

// 服务器数据接口（包含关联数据，与 Prisma Schema 保持一致）
interface ServerWithRelations {
  id: number
  company: string | null
  name: string
  model: string | null
  brand: string | null
  sn: string | null
  cpu: string | null
  cpuCores: string | null
  logicalCores: string | null
  cpuArch: string | null
  memory: string | null
  memoryModules: string | null
  disk: string | null
  diskType: string | null
  os: string | null
  osKernel: string | null
  osManagement: string | null
  oobManagement: string | null
  remoteAccess: string | null
  datacenter: string | null
  cabinet: string | null
  rackUnit: string | null
  status: string
  onlineDate: string | null
  offlineDate: string | null
  owner: string | null
  remark: string | null
  networkInfos: NetworkInfoData[] | null
  applications: ApplicationData[] | null
}

// 网络信息接口（与当前 UI 字段一致）
interface NetworkInfoData {
  nicName: string
  ipAddress: string | null
  nicPurpose: string | null
  remark: string | null
}

/**
 * 格式化网络信息为多行文本
 */
function formatNetworkInfo(networkInfos: NetworkInfoData[] | null | undefined): {
  nicInfo: string
  ipInfo: string
  purposeInfo: string
} {
  if (!networkInfos || networkInfos.length === 0) {
    return {
      nicInfo: '',
      ipInfo: '',
      purposeInfo: '',
    }
  }

  const purposeMap: Record<string, string> = {
    management: '管理口',
    business: '业务口',
    storage: '存储口',
    bmc: 'BMC',
    market: '行情口',
    trading: '交易口',
  }

  return {
    nicInfo: networkInfos.map(n => n.nicName || '-').join('\n'),
    ipInfo: networkInfos.map(n => n.ipAddress || '-').join('\n'),
    purposeInfo: networkInfos.map(n => purposeMap[n.nicPurpose || ''] || n.nicPurpose || '-').join('\n'),
  }
}

/**
 * 格式化应用信息为多行文本
 */
function formatApplicationInfo(applications: ApplicationData[] | null | undefined): {
  appNames: string
  appTypes: string
  appStatuses: string
  deployPaths: string
  appRemarks: string
} {
  if (!applications || applications.length === 0) {
    return {
      appNames: '',
      appTypes: '',
      appStatuses: '',
      deployPaths: '',
      appRemarks: '',
    }
  }

  return {
    appNames: applications.map(a => a.appName || '-').join('\n'),
    appTypes: applications.map(a => appTypeMap[a.appType || ''] || a.appType || '-').join('\n'),
    appStatuses: applications.map(a => appStatusMap[a.status || ''] || a.status || '-').join('\n'),
    deployPaths: applications.map(a => a.deployPath || '-').join('\n'),
    appRemarks: applications.map(a => a.remark || '-').join('\n'),
  }
}

/**
 * 获取所有服务器数据用于导出
 */
export async function getServersForExport(): Promise<ServerWithRelations[]> {
  return prisma.server.findMany({
    include: { networkInfos: true, applications: true },
    orderBy: [{ company: 'asc' }, { name: 'asc' }],
  }) as unknown as ServerWithRelations[]
}

/**
 * 按公司分组服务器数据
 */
export function groupServersByCompany(servers: ServerWithRelations[]): Record<string, ServerWithRelations[]> {
  const grouped: Record<string, ServerWithRelations[]> = {}
  for (const s of servers) {
    const key = s.company?.trim() || '未分配公司'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  }
  return grouped
}

/**
 * 格式化服务器数据为Excel行数据
 */
export function formatServerForExcel(server: ServerWithRelations): Record<string, string | number> {
  const netInfo = formatNetworkInfo(server.networkInfos)
  const appInfo = formatApplicationInfo(server.applications)

  return {
    // 基础信息
    company: sanitizeExcelCell(server.company || ''),
    name: sanitizeExcelCell(server.name),
    status: sanitizeExcelCell(statusMap[server.status] || server.status),
    brand: sanitizeExcelCell(server.brand || ''),
    model: sanitizeExcelCell(server.model || ''),
    sn: sanitizeExcelCell(server.sn || ''),
    cpu: sanitizeExcelCell(server.cpu || ''),
    cpuCores: sanitizeExcelCell(server.cpuCores || ''),
    logicalCores: sanitizeExcelCell(server.logicalCores || ''),
    cpuArch: sanitizeExcelCell(server.cpuArch || ''),
    memory: sanitizeExcelCell(server.memory || ''),
    memoryModules: sanitizeExcelCell(server.memoryModules || ''),
    disk: sanitizeExcelCell(server.disk || ''),
    diskType: sanitizeExcelCell(server.diskType || ''),
    os: sanitizeExcelCell(server.os || ''),
    osKernel: sanitizeExcelCell(server.osKernel || ''),
    osManagement: sanitizeExcelCell(server.osManagement || ''),
    oobManagement: sanitizeExcelCell(server.oobManagement || ''),
    datacenter: sanitizeExcelCell(server.datacenter || ''),
    cabinet: sanitizeExcelCell(server.cabinet || ''),
    rackUnit: sanitizeExcelCell(server.rackUnit || ''),
    onlineDate: sanitizeExcelCell(server.onlineDate || ''),
    offlineDate: sanitizeExcelCell(server.offlineDate || ''),
    owner: sanitizeExcelCell(server.owner || ''),
    remoteAccess: sanitizeExcelCell(server.remoteAccess || ''),
    remark: sanitizeExcelCell(server.remark || ''),
    // 网络信息
    nicName: sanitizeExcelCell(netInfo.nicInfo),
    ipAddress: sanitizeExcelCell(netInfo.ipInfo),
    nicPurpose: sanitizeExcelCell(netInfo.purposeInfo),
    // 应用信息
    appName: sanitizeExcelCell(appInfo.appNames),
    appType: sanitizeExcelCell(appInfo.appTypes),
    appStatus: sanitizeExcelCell(appInfo.appStatuses),
    deployPath: sanitizeExcelCell(appInfo.deployPaths),
    appRemark: sanitizeExcelCell(appInfo.appRemarks),
  }
}

/**
 * 格式化服务器数据为CSV行数据
 */
export function formatServerForCsv(server: ServerWithRelations): (string | number)[] {
  const netInfo = formatNetworkInfo(server.networkInfos)
  return [
    server.id,
    server.company || '',
    server.name,
    statusMap[server.status] || server.status,
    server.brand || '',
    server.model || '',
    server.sn || '',
    server.cpu || '',
    server.cpuCores || '',
    server.logicalCores || '',
    server.cpuArch || '',
    server.memory || '',
    server.memoryModules || '',
    server.disk || '',
    server.diskType || '',
    server.os || '',
    server.osKernel || '',
    server.osManagement || '',
    server.oobManagement || '',
    server.datacenter || '',
    server.cabinet || '',
    server.onlineDate || '',
    server.offlineDate || '',
    server.owner || '',
    server.remark || '',
    netInfo.nicInfo,
    netInfo.ipInfo,
    netInfo.purposeInfo,
  ]
}

/**
 * CSV导出配置
 */
export const csvExportConfig = {
  headers: [
    'ID',
    '公司名称',
    '主机名',
    '状态',
    '品牌',
    '型号',
    '序列号',
    'CPU',
    '物理核心数',
    '逻辑核心数',
    'CPU架构',
    '内存',
    '内存模块',
    '磁盘容量',
    '磁盘类型',
    '操作系统',
    '内核版本',
    '操作系统管理',
    '带外管理',
    '机房',
    '机柜',
    '上线日期',
    '下线日期',
    '资产归属',
    '备注',
    '网卡名称',
    'IP (CIDR)',
    '网卡用途',
  ],
}

/**
 * Excel导出列配置
 */
export const excelExportConfig = {
  columns: [
    // 基础信息
    { header: '公司名称', key: 'company', width: 14 },
    { header: '主机名', key: 'name', width: 22 },
    { header: '状态', key: 'status', width: 10 },
    { header: '品牌', key: 'brand', width: 14 },
    { header: '型号', key: 'model', width: 18 },
    { header: '序列号', key: 'sn', width: 20 },
    { header: 'CPU', key: 'cpu', width: 22 },
    { header: '物理核心数', key: 'cpuCores', width: 12 },
    { header: '逻辑核心数', key: 'logicalCores', width: 12 },
    { header: 'CPU架构', key: 'cpuArch', width: 12 },
    { header: '内存', key: 'memory', width: 12 },
    { header: '内存模块', key: 'memoryModules', width: 20 },
    { header: '磁盘容量', key: 'disk', width: 14 },
    { header: '磁盘类型', key: 'diskType', width: 14 },
    { header: '操作系统', key: 'os', width: 18 },
    { header: '内核版本', key: 'osKernel', width: 18 },
    { header: '操作系统管理', key: 'osManagement', width: 20 },
    { header: '带外管理', key: 'oobManagement', width: 20 },
    { header: '机房', key: 'datacenter', width: 14 },
    { header: '机柜', key: 'cabinet', width: 10 },
    { header: '上线日期', key: 'onlineDate', width: 12 },
    { header: '下线日期', key: 'offlineDate', width: 12 },
    { header: '资产归属', key: 'owner', width: 14 },
    { header: '远程接入', key: 'remoteAccess', width: 20 },
    { header: '备注', key: 'remark', width: 24 },
    // 网络信息
    { header: '网卡名称', key: 'nicName', width: 16 },
    { header: 'IP (CIDR)', key: 'ipAddress', width: 18 },
    { header: '网卡用途', key: 'nicPurpose', width: 12 },
    // 应用信息
    { header: '应用名称', key: 'appName', width: 18 },
    { header: '应用类型', key: 'appType', width: 12 },
    { header: '应用状态', key: 'appStatus', width: 12 },
    { header: '部署路径', key: 'deployPath', width: 20 },
    { header: '应用备注', key: 'appRemark', width: 18 },
  ],
}
