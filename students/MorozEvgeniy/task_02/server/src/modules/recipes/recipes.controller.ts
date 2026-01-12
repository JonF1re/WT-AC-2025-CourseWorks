import { Request, Response } from 'express'
import { RecipesService } from './recipes.service'

const service = new RecipesService()

export class RecipesController {
  async create(req: Request, res: Response) {
    const authorId = (req as any).user.sub
    const recipe = await service.create(authorId, req.body)
    res.status(201).json({ status: 'ok', data: recipe })
  }

  async list(req: Request, res: Response) {
    const ingredientIdsParam = req.query.ingredientIds as string | undefined
    const tagId = req.query.tagId as string | undefined
  
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 10
  
    const ingredientIds = ingredientIdsParam
      ? ingredientIdsParam.split(',').map(id => id.trim())
      : undefined
  
    const result = await service.list({
      ingredientIds,
      tagId,
      page,
      limit
    })
  
    res.json({
      status: 'ok',
      data: result.items,
      meta: result.meta
    })
  }
  
  async getOne(req: Request, res: Response) {
    const recipe = await service.getById(req.params.id)
    if (!recipe) {
      return res.status(404).json({ status: 'error', message: 'Not found' })
    }
    res.json({ status: 'ok', data: recipe })
  }

  async update(req: Request, res: Response) {
    try {
      const authorId = (req as any).user.sub
      const recipe = await service.update(
        req.params.id,
        authorId,
        req.body
      )
  
      res.json({ status: 'ok', data: recipe })
    } catch (e: any) {
      if (e.message === 'NOT_FOUND') {
        return res.status(404).json({ status: 'error', message: 'Not found' })
      }
      if (e.message === 'FORBIDDEN') {
        return res.status(403).json({ status: 'error', message: 'Forbidden' })
      }
      throw e
    }
  }
  
  async remove(req: Request, res: Response) {
    try {
      const authorId = (req as any).user.sub
      await service.remove(req.params.id, authorId)
  
      res.json({ status: 'ok' })
    } catch (e: any) {
      if (e.message === 'NOT_FOUND') {
        return res.status(404).json({ status: 'error', message: 'Not found' })
      }
      if (e.message === 'FORBIDDEN') {
        return res.status(403).json({ status: 'error', message: 'Forbidden' })
      }
      throw e
    }
  }  
}
