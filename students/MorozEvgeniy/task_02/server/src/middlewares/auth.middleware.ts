import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header) {
    return res.status(401).json({ status: 'error', message: 'No token' })
  }

  const token = header.replace('Bearer ', '')

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    ;(req as any).user = payload
    next()
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid token' })
  }
}
