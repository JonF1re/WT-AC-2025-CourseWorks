import { Router } from 'express'
import { ShoppingController } from './shopping.controller'
import { auth } from '../../middlewares/auth.middleware'

const router = Router()
const controller = new ShoppingController()

router.get("/", auth, controller.getList);

export default router
