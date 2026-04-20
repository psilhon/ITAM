/**
 * 高级资产导入控制器
 * 支持同时上传多个文件批量导入
 */
import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { ValidationError } from '../types'
import { batchImportServers, ImportFile } from '../services/advanced-import.service'

/**
 * 高级资产导入控制器
 */
export class AdvancedImportController {
  /**
   * 批量导入多个资产文件
   * 支持服务器和网络设备同时导入
   */
  batchImportAssets = asyncHandler(async (req: Request, res: Response) => {
    const { files } = req.body as { files?: Array<{ filename: string; content: string; type?: string }> }
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new ValidationError('请提供要导入的文件列表')
    }
    
    // 验证文件格式
    const importFiles: ImportFile[] = []
    for (const file of files) {
      if (!file.filename || typeof file.filename !== 'string') {
        throw new ValidationError('文件名不能为空')
      }
      if (!file.content || typeof file.content !== 'string') {
        throw new ValidationError(`文件 ${file.filename} 内容不能为空`)
      }
      
      const fileType = (file.type || 'auto') as 'server' | 'network-device' | 'auto'
      importFiles.push({
        filename: file.filename,
        content: file.content,
        type: fileType,
      })
    }
    
    // 执行批量导入
    const result = await batchImportServers(importFiles)
    
    res.json({
      success: true,
      data: result,
    })
  })
  
  /**
   * 批量导入服务器文件
   */
  batchImportServers = asyncHandler(async (req: Request, res: Response) => {
    const { files } = req.body as { files?: Array<{ filename: string; content: string }> }
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new ValidationError('请提供要导入的服务器文件列表')
    }
    
    // 验证文件格式
    const importFiles: ImportFile[] = []
    for (const file of files) {
      if (!file.filename || typeof file.filename !== 'string') {
        throw new ValidationError('文件名不能为空')
      }
      if (!file.content || typeof file.content !== 'string') {
        throw new ValidationError(`文件 ${file.filename} 内容不能为空`)
      }
      
      importFiles.push({
        filename: file.filename,
        content: file.content,
        type: 'server',
      })
    }
    
    // 执行批量导入
    const result = await batchImportServers(importFiles)
    
    res.json({
      success: true,
      data: result,
    })
  })
}

export const advancedImportController = new AdvancedImportController()