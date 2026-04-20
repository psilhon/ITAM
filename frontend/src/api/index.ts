import request from '../utils/request'
import axios from 'axios'

// 登录
export const login = (password: string) =>
  axios.post('/api/auth/login', { password }, { withCredentials: true }).then(r => r.data)

// 登出
export const logout = () =>
  axios.post('/api/auth/logout', {}, { withCredentials: true }).then(r => r.data)

export interface Server {
  id: number
  company?: string
  name: string
  model?: string
  brand?: string
  sn?: string
  cpu?: string
  cpuCores?: string
  logicalCores?: string
  cpuArch?: string
  memory?: string
  memoryModules?: string
  disk?: string
  diskType?: string
  os?: string
  osKernel?: string
  osManagement?: string
  oobManagement?: string
  remoteAccess?: string
  routeInfo?: string
  nicModel?: string
  datacenter?: string
  cabinet?: string
  rackUnit?: string
  status: 'running' | 'offline' | 'maintenance'
  onlineDate?: string
  offlineDate?: string
  owner?: string
  remark?: string
  createdAt: string
  updatedAt: string
  networkInfos?: NetworkInfo[]
  applications?: Application[]
}

export interface NetworkInfo {
  id: number
  serverId: number
  nicName: string
  nicStatus?: string  // 网卡状态
  ipAddress?: string
  netmask?: string    // 子网掩码
  gateway?: string    // 网关
  dns?: string        // DNS
  nicPurpose?: string
  remark?: string
}

export interface Application {
  id: number
  serverId: number
  appName: string
  appType?: string
  status: string
  deployPath?: string
  accountBinding?: string  // JSON 字符串，仅期货交易类型使用
  remark?: string
}

import type { PageResult } from '../types'
export type { PageResult }

// 服务器列表
export const getServers = (params?: Record<string, any>) =>
  request.get<any, { success: boolean; data: PageResult<Server> }>('/servers', { params })

// 服务器详情
export const getServer = (id: number) =>
  request.get<any, { success: boolean; data: Server }>(`/servers/${id}`)

// 创建服务器
export const createServer = (data: Omit<Partial<Server>, 'fieldValues'> & { networkInfos?: Partial<NetworkInfo>[]; applications?: Partial<Application>[] }) =>
  request.post<Server, { success: boolean; data: Server }>('/servers', data)

// 更新服务器
export const updateServer = (id: number, data: Omit<Partial<Server>, 'fieldValues'>) =>
  request.put<Server, { success: boolean; data: Server }>(`/servers/${id}`, data)

// 删除服务器
export const deleteServer = (id: number) =>
  request.delete<any, { success: boolean }>(`/servers/${id}`)

// 批量删除
export const batchDeleteServers = (ids: number[]) =>
  request.post<any, { success: boolean }>('/servers/batch-delete', { ids })

// 导出CSV
export const exportServersCsv = () =>
  request.get('/servers/export/csv', { responseType: 'blob' })

// 导出 Excel（每公司一个 Sheet）
export const exportServersExcel = () =>
  request.get('/servers/export/excel', { responseType: 'blob' })

// 导入资产（文本文件）
export const importServers = (content: string) =>
  request.post<any, { success: boolean; data: { total: number; created: number; updated: number; skipped: number; errors: string[] } }>('/servers/import', { content })

// 批量导入多个资产文件
export const batchImportServers = (files: Array<{ filename: string; content: string }>) =>
  request.post<any, { 
    success: boolean; 
    data: {
      files: Array<{
        filename: string;
        success: boolean;
        result?: {
          total: number;
          created: number;
          updated: number;
          skipped: number;
          errors: string[];
        };
        error?: string;
      }>;
      summary: {
        totalFiles: number;
        successFiles: number;
        totalServers: number;
        totalCreated: number;
        totalUpdated: number;
      };
    }
  }>('/servers/batch-import', { files })

// 网络信息
export const getNetworkInfos = (serverId: number) =>
  request.get<any, { success: boolean; data: NetworkInfo[] }>(`/networks/server/${serverId}`)

export const createNetworkInfo = (data: Partial<NetworkInfo>) =>
  request.post<any, { success: boolean; data: NetworkInfo }>('/networks', data)

export const updateNetworkInfo = (id: number, data: Partial<NetworkInfo>) =>
  request.put<any, { success: boolean; data: NetworkInfo }>(`/networks/${id}`, data)

export const deleteNetworkInfo = (id: number) =>
  request.delete<any, { success: boolean }>(`/networks/${id}`)

// 应用信息
export const getApplications = (serverId: number) =>
  request.get<any, { success: boolean; data: Application[] }>(`/applications/server/${serverId}`)

export const createApplication = (data: Partial<Application>) =>
  request.post<any, { success: boolean; data: Application }>('/applications', data)

export const updateApplication = (id: number, data: Partial<Application>) =>
  request.put<any, { success: boolean; data: Application }>(`/applications/${id}`, data)

export const deleteApplication = (id: number) =>
  request.delete<any, { success: boolean }>(`/applications/${id}`)

// 统计数据
export interface DashboardStats {
  overview: {
    total: number
    running: number
    offline: number
    maintenance: number
    totalApps: number
    runningApps: number
    totalNetworkDevices: number
    runningNetworkDevices: number
    offlineNetworkDevices: number
  }
  datacenterStats: Array<{ name: string; value: number }>
  osStats: Array<{ name: string; value: number }>
  ownerStats: Array<{ name: string; value: number }>
  recentServers: Array<{ id: number; name: string; status: string; datacenter: string | null; owner: string | null; createdAt: string }>
}

export const getDashboardStats = () =>
  request.get<DashboardStats, { success: boolean; data: DashboardStats }>('/stats/dashboard')

// 获取公司名称列表（用于过滤下拉）
export const getCompanies = () =>
  request.get<any, { success: boolean; data: string[] }>('/servers/meta/companies')

// 获取系统版本号
export const getVersion = () =>
  request.get<any, { success: boolean; data: string }>('/version')

// 获取系统资源占用（CPU/内存/磁盘）
export const getSystemStats = () =>
  request.get<any, { success: boolean; data: {
    cpu: { load: number; cores: number }
    memory: { used: number; total: number; percent: number }
    disk: { used: number; total: number; percent: number }
    hostname: string
    platform: string
    uptime: number
  } }>('/stats/system')

// 获取机房名称列表（支持按公司筛选）
export const getDatacenters = (company?: string) =>
  request.get<any, { success: boolean; data: string[] }>('/servers/meta/datacenters', {
    params: company ? { company } : {},
  })

// 获取资产归属列表（支持按公司筛选）
export const getOwners = (company?: string) =>
  request.get<any, { success: boolean; data: string[] }>('/servers/meta/owners', {
    params: company ? { company } : {},
  })
