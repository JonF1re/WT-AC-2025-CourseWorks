import { prisma } from "../../lib/prisma";

export class ShoppingService {
  async getList(userId: string, date: string) {
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        userId,
        date: new Date(date),
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: { ingredient: true },
            },
          },
        },
      },
    });

    const map = new Map<string, any>();

    for (const plan of mealPlans) {
      for (const item of plan.recipe.ingredients) {
        const key = `${item.ingredientId}_${item.unit}`;

        if (!map.has(key)) {
          map.set(key, {
            ingredientId: item.ingredientId,
            name: item.ingredient.name,
            unit: item.unit,
            amount: item.amount,
            isBought: false,
          });
        } else {
          map.get(key).amount += item.amount;
        }
      }
    }

    return Array.from(map.values());
  }
}
