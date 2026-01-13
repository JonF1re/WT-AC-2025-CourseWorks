import { CreateRecipeDto } from './recipes.schema'
import { prisma } from "../../lib/prisma";


export class RecipesService {
  async create(authorId: string, dto: CreateRecipeDto) {
    return prisma.recipe.create({
      data: {
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        prepTime: dto.prepTime,
        servings: dto.servings,
        authorId,
        ingredients: {
          create: dto.ingredients.map((i) => ({
            ingredient: {
              connectOrCreate: {
                where: {
                  name: i.customName!
                },
                create: {
                  name: i.customName!,
                  unit: i.unit
                }
              }
            },
            amount: i.amount,
            unit: i.unit
          }))
        },
        tags: dto.tagIds
          ? { create: dto.tagIds.map(tagId => ({ tagId })) }
          : undefined
      },
      include: {
        ingredients: { include: { ingredient: true } },
        tags: { include: { tag: true } }
      }
    })
  }

  async list(params?: {
    ingredientIds?: string[]
    tagId?: string
    page?: number
    limit?: number
  }) {
    const {
      ingredientIds,
      tagId,
      page = 1,
      limit = 10
    } = params || {}
  
    const where: any = {}
  
    if (ingredientIds && ingredientIds.length > 0) {
      where.AND = ingredientIds.map(id => ({
        ingredients: {
          some: { ingredientId: id }
        }
      }))
    }
  
    if (tagId) {
      where.tags = {
        some: { tagId }
      }
    }
  
    const skip = (page - 1) * limit
  
    const [items, total] = await Promise.all([
      prisma.recipe.findMany({
        where: Object.keys(where).length ? where : undefined,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ingredients: { include: { ingredient: true } },
          tags: { include: { tag: true } },
          author: { select: { id: true, username: true } }
        }
      }),
      prisma.recipe.count({
        where: Object.keys(where).length ? where : undefined
      })
    ])
  
    return {
      items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }
  }
  
  async getById(id: string) {
    return prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: true } },
        tags: { include: { tag: true } },
        author: { select: { id: true, username: true } }
      }
    })
  }

  async update(recipeId: string, authorId: string, dto: any) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId }
    })
  
    if (!recipe) {
      throw new Error('NOT_FOUND')
    }
  
    if (recipe.authorId !== authorId) {
      throw new Error('FORBIDDEN')
    }
  
    return prisma.recipe.update({
      where: { id: recipeId },
      data: dto
    })
  }
  
  async remove(recipeId: string, authorId: string) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId }
    })
  
    if (!recipe) {
      throw new Error('NOT_FOUND')
    }
  
    if (recipe.authorId !== authorId) {
      throw new Error('FORBIDDEN')
    }
  
    await prisma.recipe.delete({
      where: { id: recipeId }
    })
  }
}
