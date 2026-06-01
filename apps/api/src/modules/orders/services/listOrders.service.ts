import mongoose from "mongoose";

import { AppError } from "../../../shared/errors/AppError";
import { toOrder } from "../mappers/order.mapper";
import { OrderModel } from "../models/order.model";
import type { Order } from "../types/order";

export async function listOrders(input: { customerId?: string }): Promise<Order[]> {
  const filter: Record<string, unknown> = {};

  if (input.customerId) {
    if (!mongoose.Types.ObjectId.isValid(input.customerId)) {
      throw new AppError("Invalid customer ID format.", 400);
    }

    filter.customerId = new mongoose.Types.ObjectId(input.customerId);
  }

  const orders = await OrderModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();

  return orders.map((order) => toOrder(order as any));
}
