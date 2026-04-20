/**
 * Network 领域实体测试
 */

import { describe, it, expect } from 'vitest'
import { Network } from '../entities/network.entity'

describe('Network Domain Entity', () => {
  // 使用 as any 避免 Prisma 类型中已废弃字段的类型干扰
  const createMock = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 1,
    serverId: 1,
    nicName: 'eth0',
    ipAddress: '192.168.1.100/24',
    nicPurpose: 'management',
    remark: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  describe('基本属性', () => {
    it('应该正确返回基本属性', () => {
      const network = Network.fromPrisma(createMock() as any)
      expect(network.id).toBe(1)
      expect(network.serverId).toBe(1)
      expect(network.nicName).toBe('eth0')
      expect(network.ipAddress).toBe('192.168.1.100/24')
      expect(network.nicPurpose).toBe('management')
    })
  })

  describe('网卡用途检查', () => {
    it('应该正确判断管理网卡', () => {
      const mgmtNic = Network.fromPrisma(createMock({ nicPurpose: 'management' }) as any)
      const businessNic = Network.fromPrisma(createMock({ nicPurpose: 'business' }) as any)
      expect(mgmtNic.isManagementNic()).toBe(true)
      expect(mgmtNic.isBusinessNic()).toBe(false)
      expect(businessNic.isManagementNic()).toBe(false)
      expect(businessNic.isBusinessNic()).toBe(true)
    })

    it('应该正确判断BMC网卡', () => {
      const bmcNic = Network.fromPrisma(createMock({ nicPurpose: 'bmc' }) as any)
      expect(bmcNic.isBmcNic()).toBe(true)
      expect(bmcNic.isManagementNic()).toBe(false)
    })

    it('应该正确判断交易和行情网卡', () => {
      const tradingNic = Network.fromPrisma(createMock({ nicPurpose: 'trading' }) as any)
      const marketNic = Network.fromPrisma(createMock({ nicPurpose: 'market' }) as any)
      expect(tradingNic.isTradingNic()).toBe(true)
      expect(marketNic.isMarketNic()).toBe(true)
      expect(tradingNic.isMarketNic()).toBe(false)
    })
  })

  describe('IP地址检查', () => {
    it('应该正确判断是否有IP地址', () => {
      expect(Network.fromPrisma(createMock({ ipAddress: '192.168.1.1/24' }) as any).hasIpAddress()).toBe(true)
      expect(Network.fromPrisma(createMock({ ipAddress: null }) as any).hasIpAddress()).toBe(false)
    })
  })

  describe('静态验证方法', () => {
    it('应该正确验证IP地址格式（支持 CIDR）', () => {
      expect(Network.isValidIpAddress('192.168.1.1')).toBe(true)
      expect(Network.isValidIpAddress('10.0.0.1')).toBe(true)
      expect(Network.isValidIpAddress('192.168.1.1/24')).toBe(true)
      expect(Network.isValidIpAddress('192.168.1.1/32')).toBe(true)
      expect(Network.isValidIpAddress('255.255.255.255')).toBe(true)
      expect(Network.isValidIpAddress('192.168.1')).toBe(false)
      expect(Network.isValidIpAddress('192.168.1.1.1')).toBe(false)
      expect(Network.isValidIpAddress('invalid')).toBe(false)
      expect(Network.isValidIpAddress('192.168.1.1/33')).toBe(false)
    })
  })

  describe('JSON 转换', () => {
    it('应该正确转换为 JSON 对象', () => {
      const json = Network.fromPrisma(createMock() as any).toJSON()
      expect(json.id).toBe(1)
      expect(json.nicName).toBe('eth0')
      expect(json.ipAddress).toBe('192.168.1.100/24')
    })
  })
})
