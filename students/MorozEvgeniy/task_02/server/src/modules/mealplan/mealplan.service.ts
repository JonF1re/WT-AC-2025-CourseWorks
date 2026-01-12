import { AddToMealPlanDto } from './mealplan.schema'
import { prisma } from "../../lib/prisma";

export class MealPlanService {
  async add(userId: string, dto: AddToMealPlanDto) {
    try {
      return await prisma.mealPlan.create({
        data: {
          userId,
          recipeId: dto.recipeId,
          date: new Date(dto.date),
          mealType: dto.mealType
        },
        include: {
          recipe: true
        }
      });
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new Error("MEAL_ALREADY_EXISTS");
      }
      throw e;
    }
  }  

  async getByDate(userId: string, date: string) {
    return prisma.mealPlan.findMany({
      where: {
        userId,
        date: new Date(date)
      },
      include: {
        recipe: {
          include: {
            ingredients: { include: { ingredient: true } }
          }
        }
      }
    })
  }
}
