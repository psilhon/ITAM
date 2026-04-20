import { Router } from 'express'
import { networkDeviceController } from '../../controllers/network-device.controller'

const router = Router()

// 列表和详情
router.get('/', networkDeviceController.getNetworkDevices)
router.get('/meta/datacenters', networkDeviceController.getDatacenters)
router.get('/:id', networkDeviceController.getNetworkDevice)

// 新建/更新/删除
router.post('/', networkDeviceController.createNetworkDevice)
router.put('/:id', networkDeviceController.updateNetworkDevice)
router.delete('/:id', networkDeviceController.deleteNetworkDevice)
router.post('/batch-delete', networkDeviceController.batchDeleteNetworkDevices)

// 导入导出
router.post('/import', networkDeviceController.importNetworkDevices)
router.get('/export/excel', networkDeviceController.exportExcel)
router.get('/export/csv', networkDeviceController.exportCsv)

export default router