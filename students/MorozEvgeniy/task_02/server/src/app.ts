import express from 'express'
import cors from 'cors'
import authRoutes from './modules/auth/auth.routes'
import { errorMiddleware } from './middlewares/error.middleware'
import { auth } from './middlewares/auth.middleware'
import usersRoutes from './modules/users/users.routes'
import recipesRoutes from './modules/recipes/recipes.routes'
import mealPlanRoutes from './modules/mealplan/mealplan.routes'
import shoppingRoutes from './modules/shopping/shopping.routes'

const app = express()

app.use(cors())
app.use(express.json())

// routes
app.use('/auth', authRoutes)
app.use('/users', usersRoutes)
app.use('/recipes', recipesRoutes)
app.use('/mealplan', mealPlanRoutes)
app.use('/shopping', shoppingRoutes)

// errors
app.use(errorMiddleware)

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' })
})

app.get('/users/me', auth, (req, res) => {
  res.json({
    status: 'ok',
    user: (req as any).user
  })
})
  
export default app
