/**
 * API v1 路由配置
 * 所有v1版本的API路由在此注册
 */

import { Router } from 'express'
import serversRouter from './servers'
import networksRouter from './networks'
import applicationsRouter from './applications'
import statsRouter from './stats'
import networkDevicesRouter from './network-devices'

const router = Router()

// v1 API路由注册
router.use('/servers', serversRouter)
router.use('/networks', networksRouter)
router.use('/applications', applicationsRouter)
router.use('/stats', statsRouter)
router.use('/network-devices', networkDevicesRouter)

export default router
