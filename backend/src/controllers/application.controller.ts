import { Request, Response } from 'express'
import * as appService from '../services/application.service'
import { asyncHandler } from '../middleware/errorHandler'
import { ValidationError } from '../types'

/**
 * 应用信息控制器
 */
export class ApplicationController {
  /**
   * 获取服务器的应用信息列表
   */
  getApplications = asyncHandler(async (req: Request, res: Response) => {
    const serverId = parseInt(req.params.serverId, 10)
    if (isNaN(serverId) || serverId <= 0) {
      throw new ValidationError('无效的服务器 ID 参数')
    }
    const list = await appService.getApplications(serverId)
    res.json({ success: true, data: list })
  })

  /**
   * 创建应用信息
   */
  createApplication = asyncHandler(async (req: Request, res: Response) => {
    const body = JSON.parse(JSON.stringify(req.body), (_k, v) => v === null ? '' : v)
    const record = await appService.createApplication(body)
    res.status(201).json({ success: true, data: record })
  })

  /**
   * 更新应用信息
   */
  updateApplication = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError('无效的 ID 参数')
    }
    const body = JSON.parse(JSON.stringify(req.body), (_k, v) => v === null ? '' : v)
    const record = await appService.updateApplication(id, body)
    res.json({ success: true, data: record })
  })

  /**
   * 删除应用信息
   */
  deleteApplication = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError('无效的 ID 参数')
    }
    await appService.deleteApplication(id)
    res.json({ success: true, message: '删除成功' })
  })
}

// 导出单例实例
export const applicationController = new ApplicationController()
