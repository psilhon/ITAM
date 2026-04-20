/**
 * 后端 schema 验证测试
 *
 * 关键测试场景：部分更新（partial update）时，Zod schema 应只返回提供的字段，
 * 不应对未提供字段填充默认值，避免覆盖数据库中的已有数据。
 *
 * 背景：INC-20260404-01 - Zod .partial() + .default('') 组合导致部分更新时
 * 清空其他字段的问题。
 *
 * 修复说明：
 * - textField 函数的 .default('') 已移除
 * - 但 schema 中仍有 sn、status 等字段保留 .default()（非 textField）
 * - Prisma 对 undefined 字段会忽略，不会覆盖数据库值
 * - 所以关键验证点是：routeInfo/nicModel/remoteAccess 不应该有 .default('')
 */
import { describe, it, expect } from 'vitest'
import { updateServerSchema } from '../index'

describe('Server partial update schema (INC-20260404-01)', () => {
  /**
   * 核心场景：发送 routeInfo 空字符串
   *
   * 原始 Bug 复现：
   * - 发送 { routeInfo: '' }
   * - textField 的 .default('') 会对所有未提供的 textField 字段填充 ''
   * - 结果：{ routeInfo: '', nicModel: '', remoteAccess: '', company: '', ... }
   * - Prisma UPDATE 时，所有字段都被覆盖，导致数据损坏
   *
   * 修复后行为：
   * - 发送 { routeInfo: '' }
   * - routeInfo: '' (显式传入，保留)
   * - nicModel/remoteAccess: undefined (不会出现在对象中)
   * - Prisma UPDATE 时，只更新 routeInfo
   */
  describe('核心场景：发送 routeInfo 空字符串', () => {
    it('routeInfo 应该有值（显式传入的空字符串）', () => {
      const result = updateServerSchema.safeParse({ routeInfo: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        // routeInfo 是显式传入的，应该保留为空字符串
        expect(result.data.routeInfo).toBe('')
      }
    })

    it('nicModel 应该为 undefined（不会被 .default("") 填充）', () => {
      const result = updateServerSchema.safeParse({ routeInfo: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        // 关键断言：nicModel 应该是 undefined，不应该有默认值
        expect(result.data.nicModel).toBeUndefined()
      }
    })

    it('remoteAccess 应该为 undefined（不会被 .default("") 填充）', () => {
      const result = updateServerSchema.safeParse({ routeInfo: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.remoteAccess).toBeUndefined()
      }
    })

    it('company 应该为 undefined（不会被 .default("") 填充）', () => {
      const result = updateServerSchema.safeParse({ routeInfo: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.company).toBeUndefined()
      }
    })
  })

  describe('核心场景：发送 nicModel 空字符串', () => {
    it('nicModel 应该有值（显式传入）', () => {
      const result = updateServerSchema.safeParse({ nicModel: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nicModel).toBe('')
      }
    })

    it('routeInfo 应该为 undefined（不会被填充）', () => {
      const result = updateServerSchema.safeParse({ nicModel: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.routeInfo).toBeUndefined()
      }
    })

    it('remoteAccess 应该为 undefined（不会被填充）', () => {
      const result = updateServerSchema.safeParse({ nicModel: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.remoteAccess).toBeUndefined()
      }
    })
  })

  describe('核心场景：发送 remoteAccess 空字符串', () => {
    it('remoteAccess 应该有值（显式传入）', () => {
      const result = updateServerSchema.safeParse({ remoteAccess: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.remoteAccess).toBe('')
      }
    })

    it('routeInfo 应该为 undefined（不会被填充）', () => {
      const result = updateServerSchema.safeParse({ remoteAccess: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.routeInfo).toBeUndefined()
      }
    })

    it('nicModel 应该为 undefined（不会被填充）', () => {
      const result = updateServerSchema.safeParse({ remoteAccess: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nicModel).toBeUndefined()
      }
    })
  })

  describe('正常场景：发送有效值', () => {
    it('发送单个字段有效值时，其他字段不受影响', () => {
      const result = updateServerSchema.safeParse({ routeInfo: 'default via 10.0.0.1' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.routeInfo).toBe('default via 10.0.0.1')
        expect(result.data.nicModel).toBeUndefined()
        expect(result.data.remoteAccess).toBeUndefined()
      }
    })

    it('发送多个字段时，只更新提供的字段', () => {
      const result = updateServerSchema.safeParse({
        routeInfo: 'new route',
        nicModel: 'Intel E810'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.routeInfo).toBe('new route')
        expect(result.data.nicModel).toBe('Intel E810')
        expect(result.data.remoteAccess).toBeUndefined()
      }
    })
  })

  describe('边界场景：undefined 处理', () => {
    it('发送 undefined 时，字段应被省略', () => {
      const result = updateServerSchema.safeParse({ routeInfo: undefined })
      expect(result.success).toBe(true)
      if (result.success) {
        // routeInfo: undefined 应该完全不出现在输出中
        expect(result.data.routeInfo).toBeUndefined()
      }
    })
  })

  describe('长度验证', () => {
    it('超过最大长度的字段应该被拒绝', () => {
      const longString = 'a'.repeat(5001) // routeInfo max is 5000
      const result = updateServerSchema.safeParse({ routeInfo: longString })
      expect(result.success).toBe(false)
    })

    it('字段长度在限制内应该通过', () => {
      const validString = 'a'.repeat(5000)
      const result = updateServerSchema.safeParse({ routeInfo: validString })
      expect(result.success).toBe(true)
    })
  })
})