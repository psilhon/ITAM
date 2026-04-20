/**
 * Server 领域实体测试
 */

import { describe, it, expect } from 'vitest'
import { Server } from '../entities/server.entity'
import { ServerStatus } from '../../types'
import { Application } from '@prisma/client'

describe('Server Domain Entity', () => {
  const createMockServerData = (overrides: Partial<Parameters<typeof Server.fromPrisma>[0]> = {}): Parameters<typeof Server.fromPrisma>[0] => ({
    id: 1,
    name: 'Test Server',
    company: 'Test Company',
    companyPinyin: 'TC',
    datacenter: 'DC1',
    datacenterPinyin: 'DC1',
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
    offlineDate: null,
    cabinet: 'Rack-A01',
    rackUnit: null,
    owner: 'DevOps Team',
    onlineDate: '2024-01-01',
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
    ...overrides,
  })

  describe('基本属性', () => {
    it('应该正确返回基本属性', () => {
      const server = Server.fromPrisma(createMockServerData())

      expect(server.id).toBe(1)
      expect(server.name).toBe('Test Server')
      expect(server.company).toBe('Test Company')
      expect(server.status).toBe('running')
      expect(server.model).toBe('Dell R740')
      expect(server.sn).toBe('SN12345')
      expect(server.cpu).toBe('Intel Xeon Gold')
      expect(server.memory).toBe('128GB')
      expect(server.disk).toBe('4TB NVMe')
      expect(server.os).toBe('Ubuntu 22.04')
      expect(server.datacenter).toBe('DC1')
      expect(server.cabinet).toBe('Rack-A01')
      expect(server.owner).toBe('DevOps Team')
    })
  })

  describe('状态检查', () => {
    it('应该正确判断在线状态', () => {
      const runningServer = Server.fromPrisma(createMockServerData({ status: 'running' }))
      const offlineServer = Server.fromPrisma(createMockServerData({ status: 'offline' }))
      const maintenanceServer = Server.fromPrisma(createMockServerData({ status: 'maintenance' }))

      expect(runningServer.isOnline()).toBe(true)
      expect(offlineServer.isOnline()).toBe(false)
      expect(maintenanceServer.isOnline()).toBe(false)
    })

    it('应该正确判断可维护状态', () => {
      const runningServer = Server.fromPrisma(createMockServerData({ status: 'running' }))
      const offlineServer = Server.fromPrisma(createMockServerData({ status: 'offline' }))
      const maintenanceServer = Server.fromPrisma(createMockServerData({ status: 'maintenance' }))

      expect(runningServer.canMaintain()).toBe(true)
      expect(offlineServer.canMaintain()).toBe(true)
      expect(maintenanceServer.canMaintain()).toBe(false)
    })
  })

  describe('关联数据检查', () => {
    it('应该正确判断是否有网络信息', () => {
      const serverWithNetwork = Server.fromPrisma(createMockServerData({
        networkInfos: [{ id: 1, serverId: 1, nicName: 'eth0', ipAddress: '192.168.1.1/24', nicPurpose: null, remark: null, createdAt: new Date(), updatedAt: new Date() }] as any,
      }))
      const serverWithoutNetwork = Server.fromPrisma(createMockServerData())

      expect(serverWithNetwork.hasNetworkInfo()).toBe(true)
      expect(serverWithoutNetwork.hasNetworkInfo()).toBe(false)
    })

    it('应该正确判断是否有应用', () => {
      const serverWithApps = Server.fromPrisma(createMockServerData({
        applications: [{ id: 1, serverId: 1, appName: 'App1', appType: 'web', status: 'running', deployPath: null, accountBinding: null, remark: null, createdAt: new Date(), updatedAt: new Date() } as Application],
      }))
      const serverWithoutApps = Server.fromPrisma(createMockServerData())

      expect(serverWithApps.hasApplications()).toBe(true)
      expect(serverWithoutApps.hasApplications()).toBe(false)
    })
  })

  describe('网络信息获取', () => {
    it('应该返回管理网卡的IP作为主IP', () => {
      const server = Server.fromPrisma(createMockServerData({
        networkInfos: [
          { id: 1, serverId: 1, nicName: 'eth0', ipAddress: '10.0.0.1/24', nicPurpose: 'business', remark: null, createdAt: new Date(), updatedAt: new Date() },
          { id: 2, serverId: 1, nicName: 'eth1', ipAddress: '192.168.1.100/24', nicPurpose: 'management', remark: null, createdAt: new Date(), updatedAt: new Date() },
        ] as any,
      }))

      expect(server.getPrimaryIp()).toBe('192.168.1.100/24')
    })

    it('如果没有管理网卡，应该返回第一个网卡的IP', () => {
      const server = Server.fromPrisma(createMockServerData({
        networkInfos: [
          { id: 1, serverId: 1, nicName: 'eth0', ipAddress: '10.0.0.1/24', nicPurpose: 'business', remark: null, createdAt: new Date(), updatedAt: new Date() },
        ] as any,
      }))

      expect(server.getPrimaryIp()).toBe('10.0.0.1/24')
    })

    it('如果没有网络信息，应该返回null', () => {
      const server = Server.fromPrisma(createMockServerData())
      expect(server.getPrimaryIp()).toBeNull()
    })

    it('应该返回带外管理信息', () => {
      const server = Server.fromPrisma(createMockServerData({
        oobManagement: '192.168.100.10\nadmin',
      }))

      expect(server.getOobManagement()).toBe('192.168.100.10\nadmin')
    })

    it('如果没有带外管理信息，应该返回null', () => {
      const server = Server.fromPrisma(createMockServerData())
      expect(server.getOobManagement()).toBeNull()
    })
  })

  describe('JSON 转换', () => {
    it('应该正确转换为 JSON 对象', () => {
      const server = Server.fromPrisma(createMockServerData())
      const json = server.toJSON()

      expect(json.id).toBe(1)
      expect(json.name).toBe('Test Server')
      expect(json.status).toBe('running')
      expect(json.networkInfos).toEqual([])
      expect(json.applications).toEqual([])
    })
  })
})
