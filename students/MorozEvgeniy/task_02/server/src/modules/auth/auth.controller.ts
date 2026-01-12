import { Request, Response } from 'express'
import { AuthService } from './auth.service'

const authService = new AuthService()

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body)
    res.status(201).json({ status: 'ok', data: result })
  }

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body)
    res.json({ status: 'ok', data: result })
  }
}
