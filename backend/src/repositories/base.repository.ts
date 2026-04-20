/**
 * Base Repository 抽象类
 * 定义标准的数据访问接口
 */
export abstract class BaseRepository<T, CreateInput = Partial<T>, UpdateInput = Partial<T>, ID = number> {
  /**
   * 根据ID查找实体
   */
  abstract findById(id: ID): Promise<T | null>

  /**
   * 查找所有实体
   */
  abstract findAll(): Promise<T[]>

  /**
   * 创建实体
   */
  abstract create(data: CreateInput): Promise<T>

  /**
   * 更新实体
   */
  abstract update(id: ID, data: UpdateInput): Promise<T | null>

  /**
   * 删除实体
   */
  abstract delete(id: ID): Promise<boolean>

  /**
   * 检查实体是否存在
   */
  abstract exists(id: ID): Promise<boolean>
}
