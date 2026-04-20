import { Router } from 'express'
import { applicationController } from '../../controllers/application.controller'

const router = Router()

router.get('/server/:serverId', applicationController.getApplications)
router.post('/', applicationController.createApplication)
router.put('/:id', applicationController.updateApplication)
router.delete('/:id', applicationController.deleteApplication)

export default router
