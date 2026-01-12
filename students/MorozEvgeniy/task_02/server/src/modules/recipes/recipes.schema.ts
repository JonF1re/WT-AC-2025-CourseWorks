import { z } from 'zod'

export const createRecipeSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    instructions: z.string().min(5),
    prepTime: z.number().int().positive(),
    servings: z.number().int().positive(),
    ingredients: z.array(
      z.object({
        ingredientId: z.uuid().optional(),
        customName: z.string().min(1).optional(),
        amount: z.number().positive(),
        unit: z.string().min(1)
      }).refine(
        (i) => i.ingredientId || i.customName,
        { message: "Ingredient must have ingredientId or customName" }
      )
    ).min(1),    
    tagIds: z.array(z.uuid()).optional()
  })
})

export const updateRecipeSchema = z.object({
    body: z.object({
      title: z.string().min(3).optional(),
      description: z.string().optional(),
      instructions: z.string().min(5).optional(),
      prepTime: z.number().int().positive().optional(),
      servings: z.number().int().positive().optional()
    })
  })

export type CreateRecipeDto = z.infer<typeof createRecipeSchema>['body']
export type UpdateRecipeDto = z.infer<typeof updateRecipeSchema>['body'] 


