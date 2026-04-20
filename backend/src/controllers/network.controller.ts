import { Request, Response } from 'express'
import * as networkService from '../services/network.service'
import { asyncHandler } from '../middleware/errorHandler'
import { ValidationError } from '../types'

/**
 * 网络信息控制器
 */
export class NetworkController {
  /**
   * 获取服务器的网络信息列表
   */
  getNetworkInfos = asyncHandler(async (req: Request, res: Response) => {
    const serverId = parseInt(req.params.serverId, 10)
    if (isNaN(serverId) || serverId <= 0) {
      throw new ValidationError('无效的服务器 ID 参数')
    }
    const list = await networkService.getNetworkInfos(serverId)
    res.json({ success: true, data: list })
  })

  /**
   * 创建网络信息
   */
  createNetworkInfo = asyncHandler(async (req: Request, res: Response) => {
    const body = JSON.parse(JSON.stringify(req.body), (_k, v) => v === null ? '' : v)
    const record = await networkService.createNetworkInfo(body)
    res.status(201).json({ success: true, data: record })
  })

  /**
   * 更新网络信息
   */
  updateNetworkInfo = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError('无效的 ID 参数')
    }
    const body = JSON.parse(JSON.stringify(req.body), (_k, v) => v === null ? '' : v)
    const record = await networkService.updateNetworkInfo(id, body)
    res.json({ success: true, data: record })
  })

  /**
   * 删除网络信息
   */
  deleteNetworkInfo = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError('无效的 ID 参数')
    }
    await networkService.deleteNetworkInfo(id)
    res.json({ success: true, message: '删除成功' })
  })
}

// 导出单例实例
export const networkController = new NetworkController()
