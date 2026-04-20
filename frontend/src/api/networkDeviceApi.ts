import request from '../utils/request'

export interface NetworkDevice {
  id: number
  name: string
  deviceType: 'switch' | 'router' | 'firewall' | 'lb' | 'other'
  brand?: string
  model?: string
  sn?: string
  managementIp?: string
  ports?: string
  firmware?: string
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
}

import type { PageResult } from '../types'
export type { PageResult }

export const getNetworkDevices = (params?: Record<string, any>) =>
  request.get<any, { success: boolean; data: PageResult<NetworkDevice> }>('/v1/network-devices', { params })

export const getNetworkDevice = (id: number) =>
  request.get<any, { success: boolean; data: NetworkDevice }>(`/v1/network-devices/${id}`)

export const createNetworkDevice = (data: Partial<NetworkDevice>) =>
  request.post<NetworkDevice, { success: boolean; data: NetworkDevice }>('/v1/network-devices', data)

export const updateNetworkDevice = (id: number, data: Partial<NetworkDevice>) =>
  request.put<NetworkDevice, { success: boolean; data: NetworkDevice }>(`/v1/network-devices/${id}`, data)

export const deleteNetworkDevice = (id: number) =>
  request.delete<any, { success: boolean }>(`/v1/network-devices/${id}`)

export const batchDeleteNetworkDevices = (ids: number[]) =>
  request.post<any, { success: boolean }>('/v1/network-devices/batch-delete', { ids })

export const getNetworkDeviceDatacenters = () =>
  request.get<any, { success: boolean; data: string[] }>('/v1/network-devices/meta/datacenters')

// 导入导出
export const exportNetworkDevicesExcel = () =>
  request.get('/v1/network-devices/export/excel', { responseType: 'blob' })

export const exportNetworkDevicesCsv = () =>
  request.get('/v1/network-devices/export/csv', { responseType: 'blob' })

// content: CSV 时为文本内容，XLSX 时为 base64 编码
export const importNetworkDevices = (content: string, format: 'csv' | 'xlsx' = 'csv') =>
  request.post<any, { success: boolean; data: { total: number; created: number; updated: number; skipped: number; errors: string[] } }>('/v1/network-devices/import', { content, format })
