/**
 * 公共类型定义
 */

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
