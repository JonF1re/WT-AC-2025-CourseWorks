import { Router } from 'express'
import { RecipesController } from './recipes.controller'
import { auth } from '../../middlewares/auth.middleware'
import { validate } from '../../middlewares/validate.middleware'
import { createRecipeSchema } from './recipes.schema'
import { updateRecipeSchema } from './recipes.schema'

const router = Router()
const controller = new RecipesController()

router.post('/', auth, validate(createRecipeSchema), controller.create)
router.get('/', controller.list)
router.get('/:id', controller.getOne)
router.put('/:id', auth, validate(updateRecipeSchema), controller.update)
router.delete('/:id', auth, controller.remove)

export default router
