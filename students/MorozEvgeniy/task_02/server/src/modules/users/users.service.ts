import { prisma } from "../../lib/prisma";

export class UsersService {
  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        preferences: true,
        createdAt: true
      }
    })
  }

  async updatePreferences(userId: string, preferences: any) {
    return prisma.user.update({
      where: { id: userId },
      data: { preferences }
    })
  }
}
