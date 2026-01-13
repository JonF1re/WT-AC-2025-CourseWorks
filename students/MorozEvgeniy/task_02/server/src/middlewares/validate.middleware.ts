import { ZodObject } from 'zod'
import { Request, Response, NextFunction } from 'express'

export function validate(schema: ZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      })
      next()
    } catch (err: any) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: err.errors
      })
    }
  }
}
