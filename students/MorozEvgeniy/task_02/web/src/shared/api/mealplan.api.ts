import { http } from "./http";

export type MealPlanItem = {
  id: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  recipe: {
    id: string;
    title: string;
  };
};

export const mealPlanApi = {
  add(data: {
    recipeId: string;
    date: string; // YYYY-MM-DD
    mealType: "breakfast" | "lunch" | "dinner";
  }) {
    return http.post("/mealplan", data);
  },

  getByDate(date: string) {
    return http.get<{ status: string; data: MealPlanItem[] }>(
      `/mealplan?date=${date}`
    );
  },
};
