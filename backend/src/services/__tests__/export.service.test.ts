import { describe, it, expect } from 'vitest'
import {
  groupServersByCompany,
  formatServerForExcel,
  formatServerForCsv,
} from '../export.service'

describe('Export Service', () => {
  const mockServers: Record<string, unknown>[] = [
    {
      id: 1,
      company: 'Tech Corp',
      name: 'Server-01',
      model: 'Dell R740',
      sn: 'ABC123',
      cpu: 'Intel Xeon',
      memory: '64GB',
      disk: '2TB SSD',
      os: 'Ubuntu 22.04',
      osManagement: '192.168.1.10',
      oobManagement: '10.0.0.10',
      remoteAccess: 'VPN',
      datacenter: 'DC1',
      cabinet: 'A01',
      status: 'running',
      onlineDate: '2024-01-01',
      owner: 'Team A',
      remark: 'Production',
      networkInfos: [
        { nicName: 'eth0', ipAddress: '192.168.1.10/24', nicPurpose: 'management', remark: null },
      ],
      applications: [
        { appName: 'Web App', appType: 'web', status: 'running', deployPath: '/opt/app', remark: 'Main app' },
      ],
    },
    {
      id: 2,
      company: 'Tech Corp',
      name: 'Server-02',
      model: 'HP DL380',
      sn: 'DEF456',
      cpu: 'AMD EPYC',
      memory: '128GB',
      disk: '4TB NVMe',
      os: 'CentOS 8',
      osManagement: null,
      oobManagement: null,
      remoteAccess: null,
      datacenter: 'DC1',
      cabinet: 'A02',
      status: 'maintenance',
      onlineDate: '2024-02-01',
      owner: 'Team B',
      remark: null,
      networkInfos: [],
      applications: [],
    },
    {
      id: 3,
      company: null,
      name: 'Server-03',
      model: null,
      sn: null,
      cpu: null,
      memory: null,
      disk: null,
      os: null,
      osManagement: null,
      oobManagement: null,
      remoteAccess: null,
      datacenter: null,
      cabinet: null,
      status: 'offline',
      onlineDate: null,
      owner: null,
      remark: null,
      networkInfos: null,
      applications: null,
    },
  ]

  describe('groupServersByCompany', () => {
    it('should group servers by company', () => {
      const result = groupServersByCompany(mockServers as never)

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['Tech Corp']).toHaveLength(2)
      expect(result['未分配公司']).toHaveLength(1)
    })

    it('should handle empty array', () => {
      const result = groupServersByCompany([])

      expect(Object.keys(result)).toHaveLength(0)
    })
  })

  describe('formatServerForExcel', () => {
    it('should format server with all data', () => {
      const result = formatServerForExcel(mockServers[0] as never)

      expect(result.name).toBe('Server-01')
      expect(result.status).toBe('运行中')
      expect(result.nicName).toBe('eth0')
      expect(result.ipAddress).toBe('192.168.1.10/24')
      expect(result.appName).toBe('Web App')
      expect(result.appType).toBe('Web服务')
    })

    it('should format server without network/applications', () => {
      const result = formatServerForExcel(mockServers[1] as never)

      expect(result.name).toBe('Server-02')
      expect(result.status).toBe('维护中')
      expect(result.nicName).toBe('')
      expect(result.appName).toBe('')
    })

    it('should handle null values gracefully', () => {
      const result = formatServerForExcel(mockServers[2] as never)

      expect(result.name).toBe('Server-03')
      expect(result.model).toBe('')
      expect(result.status).toBe('已下线')
    })
  })

  describe('formatServerForCsv', () => {
    it('should format server as CSV row', () => {
      const result = formatServerForCsv(mockServers[0] as never)

      expect(result[0]).toBe(1) // id
      expect(result[1]).toBe('Tech Corp') // company
      expect(result[2]).toBe('Server-01') // name
      expect(result[3]).toBe('运行中') // status
    })

    it('should handle null values in CSV', () => {
      const result = formatServerForCsv(mockServers[2] as never)

      expect(result[0]).toBe(3)
      expect(result[1]).toBe('') // null company
      expect(result[3]).toBe('已下线') // status mapping
    })
  })
})
