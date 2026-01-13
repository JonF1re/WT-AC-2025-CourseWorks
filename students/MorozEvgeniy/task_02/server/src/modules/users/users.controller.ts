import { Request, Response } from 'express'
import { UsersService } from './users.service'

const usersService = new UsersService()

export class UsersController {
  async me(req: Request, res: Response) {
    const userId = (req as any).user.sub

    const user = await usersService.getMe(userId)

    res.json({
      status: 'ok',
      data: user
    })
  }

  async updatePreferences(req: Request, res: Response) {
    const userId = (req as any).user.sub
    const preferences = req.body

    const updated = await usersService.updatePreferences(userId, preferences)

    res.json({
      status: 'ok',
      data: updated.preferences
    })
  }
}
