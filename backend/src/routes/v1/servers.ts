import { Router } from 'express'
import { serverController } from '../../controllers/server.controller'

const router = Router()

// 获取公司名称列表（用于过滤下拉）
router.get('/meta/companies', serverController.getCompanies)

// 获取机房名称列表（用于过滤下拉，支持按公司筛选）
router.get('/meta/datacenters', serverController.getDatacenters)

// 获取服务器列表（支持分页、筛选、搜索）
router.get('/', serverController.getServers)

// 获取单个服务器详情
router.get('/:id', serverController.getServerById)

// 创建服务器
router.post('/', serverController.createServer)

// 更新服务器
router.put('/:id', serverController.updateServer)

// 删除服务器
router.delete('/:id', serverController.deleteServer)

// 批量删除
router.post('/batch-delete', serverController.batchDeleteServers)

// 导入资产（文本文件）
router.post('/import', serverController.importServers)

// 导出 Excel（每公司一个 Sheet）
router.get('/export/excel', serverController.exportExcel)

// 导出CSV
router.get('/export/csv', serverController.exportCsv)

export default router
