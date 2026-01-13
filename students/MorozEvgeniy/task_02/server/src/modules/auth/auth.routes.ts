import { Router } from 'express'
import { AuthController } from './auth.controller'
import { validate } from '../../middlewares/validate.middleware'
import { registerSchema, loginSchema } from './auth.schema'

const router = Router()
const controller = new AuthController()

router.post('/register', validate(registerSchema), controller.register)
router.post('/login', validate(loginSchema), controller.login)

export default router
