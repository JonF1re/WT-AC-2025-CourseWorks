import { Request, Response, NextFunction } from 'express'

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err)

  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  })
}
