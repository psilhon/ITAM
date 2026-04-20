/**
 * Server 领域事件定义
 */

import { eventBus, DomainEvent } from './event-bus'
import { ServerStatus } from '../types'

// 事件类型常量
export const ServerEventTypes = {
  CREATED: 'server:created',
  UPDATED: 'server:updated',
  DELETED: 'server:deleted',
  STATUS_CHANGED: 'server:status_changed',
  BATCH_DELETED: 'server:batch_deleted',
} as const

// 事件 Payload 类型定义
export interface ServerCreatedPayload {
  serverId: number
  name: string
  company: string | null
  status: ServerStatus
  createdAt: Date
}

export interface ServerUpdatedPayload {
  serverId: number
  name: string
  changes: Record<string, { old: unknown; new: unknown }>
  updatedAt: Date
}

export interface ServerDeletedPayload {
  serverId: number
  name: string
  deletedAt: Date
}

export interface ServerStatusChangedPayload {
  serverId: number
  name: string
  oldStatus: ServerStatus
  newStatus: ServerStatus
  changedAt: Date
}

export interface ServerBatchDeletedPayload {
  serverIds: number[]
  count: number
  deletedAt: Date
}

// 类型辅助函数
export type ServerEvent =
  | DomainEvent<ServerCreatedPayload>
  | DomainEvent<ServerUpdatedPayload>
  | DomainEvent<ServerDeletedPayload>
  | DomainEvent<ServerStatusChangedPayload>
  | DomainEvent<ServerBatchDeletedPayload>

/**
 * Server 事件发布辅助函数
 */
export const serverEvents = {
  /**
   * 发布服务器创建事件
   */
  async created(payload: ServerCreatedPayload): Promise<void> {
    await eventBus.emit(
      ServerEventTypes.CREATED,
      payload,
      payload.serverId,
      'Server'
    )
  },

  /**
   * 发布服务器更新事件
   */
  async updated(payload: ServerUpdatedPayload): Promise<void> {
    await eventBus.emit(
      ServerEventTypes.UPDATED,
      payload,
      payload.serverId,
      'Server'
    )
  },

  /**
   * 发布服务器删除事件
   */
  async deleted(payload: ServerDeletedPayload): Promise<void> {
    await eventBus.emit(
      ServerEventTypes.DELETED,
      payload,
      payload.serverId,
      'Server'
    )
  },

  /**
   * 发布服务器状态变更事件
   */
  async statusChanged(payload: ServerStatusChangedPayload): Promise<void> {
    await eventBus.emit(
      ServerEventTypes.STATUS_CHANGED,
      payload,
      payload.serverId,
      'Server'
    )
  },

  /**
   * 发布批量删除事件
   */
  async batchDeleted(payload: ServerBatchDeletedPayload): Promise<void> {
    await eventBus.emit(
      ServerEventTypes.BATCH_DELETED,
      payload,
      undefined,
      'Server'
    )
  },
}

/**
 * Server 事件订阅辅助函数
 */
export const serverEventHandlers = {
  /**
   * 订阅服务器创建事件
   */
  onCreated(handler: (event: DomainEvent<ServerCreatedPayload>) => void | Promise<void>): () => void {
    return eventBus.subscribe(ServerEventTypes.CREATED, handler)
  },

  /**
   * 订阅服务器更新事件
   */
  onUpdated(handler: (event: DomainEvent<ServerUpdatedPayload>) => void | Promise<void>): () => void {
    return eventBus.subscribe(ServerEventTypes.UPDATED, handler)
  },

  /**
   * 订阅服务器删除事件
   */
  onDeleted(handler: (event: DomainEvent<ServerDeletedPayload>) => void | Promise<void>): () => void {
    return eventBus.subscribe(ServerEventTypes.DELETED, handler)
  },

  /**
   * 订阅服务器状态变更事件
   */
  onStatusChanged(handler: (event: DomainEvent<ServerStatusChangedPayload>) => void | Promise<void>): () => void {
    return eventBus.subscribe(ServerEventTypes.STATUS_CHANGED, handler)
  },

  /**
   * 订阅批量删除事件
   */
  onBatchDeleted(handler: (event: DomainEvent<ServerBatchDeletedPayload>) => void | Promise<void>): () => void {
    return eventBus.subscribe(ServerEventTypes.BATCH_DELETED, handler)
  },
}
