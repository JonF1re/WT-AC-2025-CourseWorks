import { describe, it, expect } from "vitest";
import { aggregateIngredients } from "./mealplan.utils";

describe("aggregateIngredients", () => {
  it("aggregates same ingredients from multiple recipes", () => {
    const mealPlans = [
      {
        recipe: {
          ingredients: [
            {
              amount: 2,
              ingredient: { id: "egg", name: "Egg", unit: "pcs" }
            }
          ]
        }
      },
      {
        recipe: {
          ingredients: [
            {
              amount: 3,
              ingredient: { id: "egg", name: "Egg", unit: "pcs" }
            }
          ]
        }
      }
    ];

    const result = aggregateIngredients(mealPlans);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ingredientId: "egg",
      name: "Egg",
      unit: "pcs",
      amount: 5
    });
  });

  it("returns empty array when meal plan is empty", () => {
    const result = aggregateIngredients([]);
    expect(result).toEqual([]);
  });
});
