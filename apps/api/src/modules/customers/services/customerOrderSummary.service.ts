import mongoose from "mongoose";

import { OrderModel } from "../../orders/models/order.model";

export type CustomerOrderSummary = {
  orderCount: number;
  completedOrderCount: number;
  totalEarning: number;
  lastCompletedOrderAt?: Date;
};

type CustomerOrderSummaryRow = Omit<CustomerOrderSummary, "lastCompletedOrderAt"> & {
  _id: unknown;
  lastCompletedOrderAt?: Date | null;
};

const completedOrderExpression = {
  $and: [
    { $eq: ["$status", "delivered"] },
    { $eq: [{ $type: "$completedAt" }, "date"] },
  ],
};

export async function getCustomerOrderSummaryMap(
  customerIds: readonly unknown[]
): Promise<Map<string, CustomerOrderSummary>> {
  const ids = customerIds.filter(
    (customerId) => customerId !== null && customerId !== undefined
  );

  if (!ids.length) {
    return new Map();
  }

  const rows = await OrderModel.aggregate<CustomerOrderSummaryRow>([
    { $match: { customerId: { $in: ids } } },
    {
      $addFields: {
        isCompletedOrder: completedOrderExpression,
      },
    },
    {
      $group: {
        _id: "$customerId",
        orderCount: { $sum: 1 },
        completedOrderCount: {
          $sum: { $cond: ["$isCompletedOrder", 1, 0] },
        },
        totalEarning: {
          $sum: { $cond: ["$isCompletedOrder", "$totalAmount", 0] },
        },
        lastCompletedOrderAt: {
          $max: {
            $cond: ["$isCompletedOrder", "$completedAt", null],
          },
        },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        orderCount: row.orderCount,
        completedOrderCount: row.completedOrderCount,
        totalEarning: row.totalEarning,
        lastCompletedOrderAt: row.lastCompletedOrderAt ?? undefined,
      },
    ])
  );
}

export async function getCustomerOrderSummary(
  customerId: string | mongoose.Types.ObjectId
): Promise<CustomerOrderSummary | undefined> {
  const normalizedCustomerId =
    typeof customerId === "string" ? new mongoose.Types.ObjectId(customerId) : customerId;
  const summaries = await getCustomerOrderSummaryMap([normalizedCustomerId]);

  return summaries.get(String(normalizedCustomerId));
}
