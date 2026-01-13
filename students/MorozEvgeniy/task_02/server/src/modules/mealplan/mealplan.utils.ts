type RecipeIngredient = {
    amount: number;
    ingredient: {
      id: string;
      name: string;
      unit: string;
    };
  };
  
  type MealPlanItem = {
    recipe: {
      ingredients: RecipeIngredient[];
    };
  };
  
  export function aggregateIngredients(mealPlans: MealPlanItem[]) {
    const map = new Map<
      string,
      { ingredientId: string; name: string; unit: string; amount: number }
    >();
  
    for (const plan of mealPlans) {
      for (const item of plan.recipe.ingredients) {
        const key = item.ingredient.id;
  
        if (!map.has(key)) {
          map.set(key, {
            ingredientId: key,
            name: item.ingredient.name,
            unit: item.ingredient.unit,
            amount: 0
          });
        }
  
        map.get(key)!.amount += item.amount;
      }
    }
  
    return Array.from(map.values());
  }
  