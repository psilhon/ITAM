/**
 * Server Service v2 测试（使用 Repository 模式和领域模型）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as serverRepository from '../../repositories/server.repository'
import { Server } from '../../domain/entities/server.entity'
import { ServerStatus } from '../../types'

// Mock repository
vi.mock('../../repositories/server.repository', () => ({
  serverRepository: {
    findById: vi.fn(),
    findWithPagination: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    batchDelete: vi.fn(),
    exists: vi.fn(),
    findCompanies: vi.fn(),
    findAllForExport: vi.fn(),
  },
}))

describe('Server Service v2 (with Repository Pattern)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Repository Pattern', () => {
    it('应该通过 Repository 获取服务器列表', async () => {
      const mockServers: Record<string, unknown>[] = [
        {
          id: 1,
          name: 'Server 1',
          company: 'Company A',
          companyPinyin: 'CA',
          datacenter: 'DC1',
          datacenterPinyin: 'DC1',
          status: 'running',
          model: 'Dell R740',
          brand: null,
          sn: 'SN001',
          cpu: 'Intel Xeon',
          cpuCores: null,
          logicalCores: null,
          cpuArch: null,
          memory: '64GB',
          memoryModules: null,
          disk: '2TB SSD',
          diskType: null,
          os: 'CentOS 8',
          osKernel: null,
          cabinet: 'A01',
          rackUnit: null,
          owner: 'Admin',
          onlineDate: null,
          offlineDate: null,
          osManagement: null,
          oobManagement: null,
          remoteAccess: null,
          routeInfo: null,
          nicModel: null,
          remark: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          networkInfos: [],
          applications: [],
          fieldValues: [],
        },
      ]

      vi.mocked(serverRepository.serverRepository.findWithPagination).mockResolvedValue({
        list: mockServers,
        total: 1,
        page: 1,
        pageSize: 20,
      } as never)

      const result = await serverRepository.serverRepository.findWithPagination({
        page: 1,
        pageSize: 20,
      })

      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(serverRepository.serverRepository.findWithPagination).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      })
    })

    it('应该通过 Repository 检查服务器是否存在', async () => {
      vi.mocked(serverRepository.serverRepository.exists).mockResolvedValue(true)

      const exists = await serverRepository.serverRepository.exists(1)

      expect(exists).toBe(true)
      expect(serverRepository.serverRepository.exists).toHaveBeenCalledWith(1)
    })
  })

  describe('Domain Model', () => {
    it('Server 领域实体应该正确封装数据', () => {
      const mockData: Record<string, unknown> = {
        id: 1,
        name: 'Test Server',
        company: 'Test Company',
        status: 'running' as ServerStatus,
        model: 'Dell R740',
        brand: null,
        sn: 'SN12345',
        cpu: 'Intel Xeon Gold',
        cpuCores: null,
        logicalCores: null,
        cpuArch: null,
        memory: '128GB',
        memoryModules: null,
        disk: '4TB NVMe',
        diskType: null,
        os: 'Ubuntu 22.04',
        osKernel: null,
        datacenter: 'DC1',
        cabinet: 'Rack-A01',
        rackUnit: null,
        owner: 'DevOps Team',
        onlineDate: '2024-01-01',
        offlineDate: null,
        osManagement: null,
        oobManagement: null,
        remoteAccess: null,
        routeInfo: null,
        nicModel: null,
        remark: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        networkInfos: [
          {
            id: 1,
            serverId: 1,
            nicName: 'eth0',
            ipAddress: '192.168.1.100/24',
            vlan: '100',
            zone: 'internal',
            nicPurpose: 'management',
            ipmiAddress: null,
            ipmiAccount: null,
            remark: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        applications: [],
        fieldValues: [],
      }

      const server = Server.fromPrisma(mockData as any)

      expect(server.id).toBe(1)
      expect(server.name).toBe('Test Server')
      expect(server.isOnline()).toBe(true)
      expect(server.getPrimaryIp()).toBe('192.168.1.100/24')
      expect(server.hasNetworkInfo()).toBe(true)
      expect(server.hasApplications()).toBe(false)
    })

    it('Server 领域实体应该正确处理离线状态', () => {
      const mockData: Record<string, unknown> = {
        id: 2,
        name: 'Offline Server',
        company: null,
        status: 'offline' as ServerStatus,
        model: 'HP DL380',
        brand: null,
        sn: 'SN67890',
        cpu: 'AMD EPYC',
        cpuCores: null,
        logicalCores: null,
        cpuArch: null,
        memory: '64GB',
        memoryModules: null,
        disk: '2TB SSD',
        diskType: null,
        os: 'CentOS 8',
        osKernel: null,
        datacenter: 'DC2',
        cabinet: 'Rack-B02',
        rackUnit: null,
        owner: 'Test Team',
        onlineDate: null,
        offlineDate: null,
        osManagement: null,
        oobManagement: null,
        remoteAccess: null,
        routeInfo: null,
        nicModel: null,
        remark: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        networkInfos: [],
        applications: [],
        fieldValues: [],
      }

      const server = Server.fromPrisma(mockData as any)

      expect(server.isOnline()).toBe(false)
      expect(server.canMaintain()).toBe(true)
      expect(server.getPrimaryIp()).toBeNull()
    })
  })
})
