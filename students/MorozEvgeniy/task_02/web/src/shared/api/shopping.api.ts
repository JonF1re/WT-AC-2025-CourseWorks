import { http } from "./http";

export type ShoppingItem = {
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  isBought: boolean;
};

export const shoppingApi = {
  getByDate(date: string) {
    return http.get<{ status: string; data: ShoppingItem[] }>(
      `/shopping?date=${date}`
    );
  },

  toggle(id: string, isBought: boolean) {
    return http.patch(`/shopping/${id}`, { isBought });
  },
};
