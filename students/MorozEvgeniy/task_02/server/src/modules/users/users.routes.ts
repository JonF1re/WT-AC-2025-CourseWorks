import { Router } from 'express'
import { UsersController } from './users.controller'
import { auth } from '../../middlewares/auth.middleware'

const router = Router()
const controller = new UsersController()

router.get('/me', auth, controller.me)
router.patch('/me/preferences', auth, controller.updatePreferences)

export default router
