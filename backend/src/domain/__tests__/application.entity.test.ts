/**
 * Application 领域实体测试
 */

import { describe, it, expect } from 'vitest'
import { Application } from '../entities/application.entity'
import { AppStatus, AppType } from '../../types'

describe('Application Domain Entity', () => {
  const createMockAppData = (overrides: Partial<Parameters<typeof Application.fromPrisma>[0]> = {}): Parameters<typeof Application.fromPrisma>[0] => ({
    id: 1,
    serverId: 1,
    appName: 'Test Application',
    appType: 'web' as AppType,
    status: 'running' as AppStatus,
    deployPath: '/opt/app/test',
    accountBinding: null,
    remark: 'Test remark',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  describe('基本属性', () => {
    it('应该正确返回基本属性', () => {
      const app = Application.fromPrisma(createMockAppData())

      expect(app.id).toBe(1)
      expect(app.serverId).toBe(1)
      expect(app.appName).toBe('Test Application')
      expect(app.appType).toBe('web')
      expect(app.status).toBe('running')
      expect(app.deployPath).toBe('/opt/app/test')
      expect(app.remark).toBe('Test remark')
    })
  })

  describe('状态检查', () => {
    it('应该正确判断运行状态', () => {
      const runningApp = Application.fromPrisma(createMockAppData({ status: 'running' }))
      const stoppedApp = Application.fromPrisma(createMockAppData({ status: 'stopped' }))
      const errorApp = Application.fromPrisma(createMockAppData({ status: 'error' }))

      expect(runningApp.isRunning()).toBe(true)
      expect(runningApp.isStopped()).toBe(false)
      expect(runningApp.hasError()).toBe(false)

      expect(stoppedApp.isRunning()).toBe(false)
      expect(stoppedApp.isStopped()).toBe(true)

      expect(errorApp.hasError()).toBe(true)
    })
  })

  describe('应用类型检查', () => {
    it('应该正确判断Web应用', () => {
      const webApp = Application.fromPrisma(createMockAppData({ appType: 'web' }))
      const dbApp = Application.fromPrisma(createMockAppData({ appType: 'database' }))

      expect(webApp.isWebApplication()).toBe(true)
      expect(dbApp.isWebApplication()).toBe(false)
    })

    it('应该正确判断数据库', () => {
      const dbApp = Application.fromPrisma(createMockAppData({ appType: 'database' }))
      expect(dbApp.isDatabase()).toBe(true)
    })

    it('应该正确判断中间件', () => {
      const middlewareApp = Application.fromPrisma(createMockAppData({ appType: 'middleware' }))
      expect(middlewareApp.isMiddleware()).toBe(true)
    })

    it('应该正确判断缓存服务', () => {
      const cacheApp = Application.fromPrisma(createMockAppData({ appType: 'cache' }))
      expect(cacheApp.isCache()).toBe(true)
    })

    it('应该正确判断交易应用', () => {
      const futuresApp = Application.fromPrisma(createMockAppData({ appType: 'futures_trading' }))
      const stockApp = Application.fromPrisma(createMockAppData({ appType: 'stock_trading' }))
      const webApp = Application.fromPrisma(createMockAppData({ appType: 'web' }))

      expect(futuresApp.isTradingApp()).toBe(true)
      expect(stockApp.isTradingApp()).toBe(true)
      expect(webApp.isTradingApp()).toBe(false)
    })

    it('应该正确判断行情应用', () => {
      const marketApp = Application.fromPrisma(createMockAppData({ appType: 'data_related' }))
      expect(marketApp.isMarketDataApp()).toBe(true)
    })
  })

  describe('部署路径', () => {
    it('应该正确判断是否有部署路径', () => {
      const appWithPath = Application.fromPrisma(createMockAppData({ deployPath: '/opt/app' }))
      const appWithoutPath = Application.fromPrisma(createMockAppData({ deployPath: null }))
      const appWithEmptyPath = Application.fromPrisma(createMockAppData({ deployPath: '' }))
      const appWithWhitespacePath = Application.fromPrisma(createMockAppData({ deployPath: '   ' }))

      expect(appWithPath.hasDeployPath()).toBe(true)
      expect(appWithoutPath.hasDeployPath()).toBe(false)
      expect(appWithEmptyPath.hasDeployPath()).toBe(false)
      expect(appWithWhitespacePath.hasDeployPath()).toBe(false)
    })

    it('应该正确获取部署目录名', () => {
      const app1 = Application.fromPrisma(createMockAppData({ deployPath: '/opt/app/myapp' }))
      const app2 = Application.fromPrisma(createMockAppData({ deployPath: '/opt/app/' }))
      const app3 = Application.fromPrisma(createMockAppData({ deployPath: null }))

      expect(app1.getDeployDirectory()).toBe('myapp')
      expect(app2.getDeployDirectory()).toBe('app')
      expect(app3.getDeployDirectory()).toBeNull()
    })
  })

  describe('状态变更', () => {
    it('应该能够启动应用', () => {
      const app = Application.fromPrisma(createMockAppData({ status: 'stopped' }))
      app.start()
      expect(app.isRunning()).toBe(true)
    })

    it('启动已运行的应用应该抛出错误', () => {
      const app = Application.fromPrisma(createMockAppData({ status: 'running' }))
      expect(() => app.start()).toThrow('应用已在运行状态')
    })

    it('应该能够停止应用', () => {
      const app = Application.fromPrisma(createMockAppData({ status: 'running' }))
      app.stop()
      expect(app.isStopped()).toBe(true)
    })

    it('停止已停止的应用应该抛出错误', () => {
      const app = Application.fromPrisma(createMockAppData({ status: 'stopped' }))
      expect(() => app.stop()).toThrow('应用已处于停止状态')
    })

    it('应该能够标记错误', () => {
      const app = Application.fromPrisma(createMockAppData({ status: 'running' }))
      app.markError()
      expect(app.hasError()).toBe(true)
    })

    it('应该能够重启应用', () => {
      const app = Application.fromPrisma(createMockAppData({ status: 'error' }))
      app.restart()
      expect(app.isRunning()).toBe(true)
    })
  })

  describe('显示名称', () => {
    it('应该返回正确的应用类型显示名称', () => {
      const webApp = Application.fromPrisma(createMockAppData({ appType: 'web' }))
      const dbApp = Application.fromPrisma(createMockAppData({ appType: 'database' }))
      const middlewareApp = Application.fromPrisma(createMockAppData({ appType: 'middleware' }))
      const cacheApp = Application.fromPrisma(createMockAppData({ appType: 'cache' }))
      const futuresApp = Application.fromPrisma(createMockAppData({ appType: 'futures_trading' }))
      const stockApp = Application.fromPrisma(createMockAppData({ appType: 'stock_trading' }))
      const dataApp = Application.fromPrisma(createMockAppData({ appType: 'data_related' }))
      const otherApp = Application.fromPrisma(createMockAppData({ appType: 'other' }))

      expect(webApp.getAppTypeDisplayName()).toBe('Web应用')
      expect(dbApp.getAppTypeDisplayName()).toBe('数据库')
      expect(middlewareApp.getAppTypeDisplayName()).toBe('中间件')
      expect(cacheApp.getAppTypeDisplayName()).toBe('缓存服务')
      expect(futuresApp.getAppTypeDisplayName()).toBe('期货交易')
      expect(stockApp.getAppTypeDisplayName()).toBe('股票交易')
      expect(dataApp.getAppTypeDisplayName()).toBe('数据相关')
      expect(otherApp.getAppTypeDisplayName()).toBe('其他')
    })

    it('应该返回正确的状态显示名称', () => {
      const runningApp = Application.fromPrisma(createMockAppData({ status: 'running' }))
      const stoppedApp = Application.fromPrisma(createMockAppData({ status: 'stopped' }))
      const errorApp = Application.fromPrisma(createMockAppData({ status: 'error' }))

      expect(runningApp.getStatusDisplayName()).toBe('运行中')
      expect(stoppedApp.getStatusDisplayName()).toBe('已停止')
      expect(errorApp.getStatusDisplayName()).toBe('错误')
    })
  })

  describe('JSON 转换', () => {
    it('应该正确转换为 JSON 对象', () => {
      const app = Application.fromPrisma(createMockAppData())
      const json = app.toJSON()

      expect(json.id).toBe(1)
      expect(json.appName).toBe('Test Application')
      expect(json.appType).toBe('web')
      expect(json.status).toBe('running')
    })
  })
})
