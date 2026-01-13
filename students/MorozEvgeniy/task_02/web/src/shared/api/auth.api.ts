import { http } from "./http";

export const authApi = {
  login(data: { email: string; password: string }) {
    return http.post("/auth/login", data);
  },

  register(data: { email: string; password: string; username: string }) {
    return http.post("/auth/register", data);
  }  
};
