import mongoose from "mongoose";

import { AppError } from "../../../shared/errors/AppError";
import { toOrder } from "../mappers/order.mapper";
import { OrderModel } from "../models/order.model";
import type { Order } from "../types/order";

export async function completeOrder(input: { orderId: string }): Promise<Order> {
  if (!mongoose.Types.ObjectId.isValid(input.orderId)) {
    throw new AppError("Invalid order ID format.", 400);
  }

  const order = await OrderModel.findByIdAndUpdate(
    input.orderId,
    { completedAt: new Date(), status: "delivered" },
    { new: true }
  ).lean();

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  return toOrder(order as any);
}
