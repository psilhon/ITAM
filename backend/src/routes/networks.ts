import { Router } from 'express'
import { networkController } from '../controllers/network.controller'

const router = Router()

router.get('/server/:serverId', networkController.getNetworkInfos)
router.post('/', networkController.createNetworkInfo)
router.put('/:id', networkController.updateNetworkInfo)
router.delete('/:id', networkController.deleteNetworkInfo)

export default router
