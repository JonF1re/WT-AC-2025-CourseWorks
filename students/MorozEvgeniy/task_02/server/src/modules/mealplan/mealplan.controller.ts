import { Request, Response } from 'express'
import { MealPlanService } from './mealplan.service'

const service = new MealPlanService()

export class MealPlanController {
  async add(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub;
      const item = await service.add(userId, req.body);
      res.status(201).json({ status: "ok", data: item });
    } catch (e: any) {
      if (e.message === "MEAL_ALREADY_EXISTS") {
        return res
          .status(400)
          .json({ status: "error", message: "Приём пищи уже запланирован" });
      }
  
      throw e;
    }
  }  

  async getByDate(req: Request, res: Response) {
    const userId = (req as any).user.sub
    const date = req.query.date as string

    const items = await service.getByDate(userId, date)
    res.json({ status: 'ok', data: items })
  }
}
