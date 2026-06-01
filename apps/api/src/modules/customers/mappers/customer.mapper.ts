import type { Customer, CustomerSummary } from "../types/customer";

export type CustomerLike = {
  _id: unknown;
  discordId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type CustomerOrderSummary = {
  orderCount: number;
  completedOrderCount: number;
  totalEarning: number;
  lastCompletedOrderAt?: Date;
};

export function toCustomer(record: CustomerLike): Customer {
  return {
    id: String(record._id),
    discordId: record.discordId ?? undefined,
    name: record.name,
    email: record.email,
    phone: record.phone ?? undefined,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

export function toCustomerSummary(
  record: CustomerLike,
  orderSummary?: CustomerOrderSummary
): CustomerSummary {
  return {
    ...toCustomer(record),
    orderCount: orderSummary?.orderCount ?? 0,
    completedOrderCount: orderSummary?.completedOrderCount ?? 0,
    totalEarning: orderSummary?.totalEarning ?? 0,
    lastCompletedOrderAt: orderSummary?.lastCompletedOrderAt
      ? toIsoString(orderSummary.lastCompletedOrderAt)
      : undefined,
  };
}

function toIsoString(value?: Date) {
  return (value ?? new Date()).toISOString();
}
