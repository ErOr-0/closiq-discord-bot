import type { Request, Response } from "express";
import { z } from "zod";

import { completeOrder } from "../services/completeOrder.service";
import { listOrders } from "../services/listOrders.service";

const listOrdersSchema = z.object({
  customerId: z.string().trim().min(1).optional(),
});

const orderParamsSchema = z.object({
  orderId: z.string().trim().min(1),
});

export async function listOrdersController(req: Request, res: Response) {
  const input = listOrdersSchema.parse(req.query);
  const data = await listOrders(input);

  res.json({ data });
}

export async function completeOrderController(req: Request, res: Response) {
  const input = orderParamsSchema.parse(req.params);
  const data = await completeOrder(input);

  res.json({ data });
}
