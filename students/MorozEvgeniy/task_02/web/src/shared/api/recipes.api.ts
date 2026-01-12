import { http } from "./http";

export type Recipe = {
  id: string;
  title: string;
  description?: string;
  instructions: string;
  prepTime: number;
  servings: number;
};

export const recipesApi = {
  getAll() {
    return http.get<{ status: string; data: Recipe[] }>("/recipes");
  },

  getById(id: string) {
    return http.get<{ status: string; data: RecipeDetails }>(
      `/recipes/${id}`
    );
  },

  create(data: {
    title: string;
    description?: string;
    instructions: string;
    prepTime: number;
    servings: number;
    ingredients: {
      customName: string;
      amount: number;
      unit: string;
    }[];
  }) {
    return http.post("/recipes", data);
  },
};

export type RecipeDetails = {
  id: string;
  title: string;
  description?: string;
  instructions: string;
  prepTime: number;
  servings: number;
  ingredients: {
    id: string;
    amount: number;
    unit: string;
    ingredient: {
      id: string;
      name: string;
      unit: string;
    };
  }[];
};
