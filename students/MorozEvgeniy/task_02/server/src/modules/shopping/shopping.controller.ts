import { Request, Response } from "express";
import { ShoppingService } from "./shopping.service";

const service = new ShoppingService();

export class ShoppingController {
  async getList(req: Request, res: Response) {
    const userId = (req as any).user.sub;
    const date = req.query.date as string;

    const list = await service.getList(userId, date);
    res.json({ status: "ok", data: list });
  }
}
