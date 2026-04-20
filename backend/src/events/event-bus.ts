/**
 * 领域事件总线
 * 实现发布-订阅模式，用于解耦领域逻辑
 */

import { error as logError } from '../logger'

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>

export interface DomainEvent<T = unknown> {
  /** 事件类型 */
  type: string
  /** 事件数据 */
  payload: T
  /** 事件发生时间 */
  timestamp: Date
  /** 事件ID */
  id: string
  /** 聚合根ID */
  aggregateId?: string | number
  /** 聚合根类型 */
  aggregateType?: string
}

/**
 * 事件总线类
 */
export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private static instance: EventBus

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * 订阅事件
   * @param eventType 事件类型
   * @param handler 事件处理器
   * @returns 取消订阅函数
   */
  subscribe<T>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    
    const handlers = this.handlers.get(eventType)!
    handlers.add(handler as EventHandler)

    // 返回取消订阅函数
    return () => {
      handlers.delete(handler as EventHandler)
      if (handlers.size === 0) {
        this.handlers.delete(eventType)
      }
    }
  }

  /**
   * 发布事件
   * @param event 领域事件
   */
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type)
    
    if (!handlers || handlers.size === 0) {
      return
    }

    // 并行执行所有处理器
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event)
      } catch (error) {
        logError(`Error handling event ${event.type}`, error as Error, { eventType: event.type })
      }
    })

    await Promise.all(promises)
  }

  /**
   * 创建并发布事件
   * @param type 事件类型
   * @param payload 事件数据
   * @param aggregateId 聚合根ID
   * @param aggregateType 聚合根类型
   */
  async emit<T>(
    type: string,
    payload: T,
    aggregateId?: string | number,
    aggregateType?: string
  ): Promise<void> {
    const event: DomainEvent<T> = {
      id: this.generateEventId(),
      type,
      payload,
      timestamp: new Date(),
      aggregateId,
      aggregateType,
    }
    
    await this.publish(event)
  }

  /**
   * 生成唯一事件ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取已注册的事件类型
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * 清空所有处理器（主要用于测试）
   */
  clear(): void {
    this.handlers.clear()
  }
}

// 导出单例实例
export const eventBus = EventBus.getInstance()
