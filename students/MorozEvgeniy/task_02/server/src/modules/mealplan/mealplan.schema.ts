import { z } from 'zod'

export const addToMealPlanSchema = z.object({
  body: z.object({
    recipeId: z.uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mealType: z.enum(['breakfast', 'lunch', 'dinner'])
  })
})

export type AddToMealPlanDto = z.infer<typeof addToMealPlanSchema>['body']
