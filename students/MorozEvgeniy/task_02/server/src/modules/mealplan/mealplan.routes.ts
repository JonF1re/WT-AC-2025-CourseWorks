import { Router } from 'express'
import { MealPlanController } from './mealplan.controller'
import { auth } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { addToMealPlanSchema } from './mealplan.schema'

const router = Router()
const controller = new MealPlanController()

router.post('/', auth, validate(addToMealPlanSchema), controller.add)
router.get('/', auth, controller.getByDate)

export default router
