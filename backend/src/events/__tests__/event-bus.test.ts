/**
 * EventBus 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus, DomainEvent } from '../event-bus'

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = EventBus.getInstance()
    eventBus.clear()
  })

  it('应该是单例模式', () => {
    const instance1 = EventBus.getInstance()
    const instance2 = EventBus.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('应该能够订阅和发布事件', async () => {
    const handler = vi.fn()
    
    eventBus.subscribe('test:event', handler)
    
    await eventBus.emit('test:event', { foo: 'bar' })
    
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test:event',
        payload: { foo: 'bar' },
      })
    )
  })

  it('应该支持多个处理器', async () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    
    eventBus.subscribe('test:multi', handler1)
    eventBus.subscribe('test:multi', handler2)
    
    await eventBus.emit('test:multi', { data: 'test' })
    
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  it('应该能够取消订阅', async () => {
    const handler = vi.fn()
    
    const unsubscribe = eventBus.subscribe('test:unsub', handler)
    
    await eventBus.emit('test:unsub', { data: 1 })
    expect(handler).toHaveBeenCalledTimes(1)
    
    unsubscribe()
    
    await eventBus.emit('test:unsub', { data: 2 })
    expect(handler).toHaveBeenCalledTimes(1) // 不应该再被调用
  })

  it('应该包含事件元数据', async () => {
    const handler = vi.fn()
    
    eventBus.subscribe('test:meta', handler)
    
    await eventBus.emit('test:meta', { test: true }, 123, 'Server')
    
    const event = handler.mock.calls[0][0] as DomainEvent
    expect(event.id).toBeDefined()
    expect(event.timestamp).toBeInstanceOf(Date)
    expect(event.aggregateId).toBe(123)
    expect(event.aggregateType).toBe('Server')
  })

  it('处理器异常不应该影响其他处理器', async () => {
    const errorHandler = vi.fn().mockImplementation(() => {
      throw new Error('Handler error')
    })
    const successHandler = vi.fn()
    
    eventBus.subscribe('test:error', errorHandler)
    eventBus.subscribe('test:error', successHandler)
    
    // 不应该抛出异常
    await expect(eventBus.emit('test:error', {})).resolves.not.toThrow()
    
    expect(errorHandler).toHaveBeenCalledTimes(1)
    expect(successHandler).toHaveBeenCalledTimes(1)
  })

  it('应该返回已注册的事件类型', () => {
    eventBus.subscribe('event:a', () => {})
    eventBus.subscribe('event:b', () => {})
    
    const types = eventBus.getRegisteredEventTypes()
    
    expect(types).toContain('event:a')
    expect(types).toContain('event:b')
    expect(types).toHaveLength(2)
  })
})
