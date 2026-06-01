import type { Order, OrderItem, OrderStatus } from "../types/order";

type OrderLike = {
  _id: unknown;
  customerId: unknown;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  trackingNumber?: string | null;
  shippingAddress: string;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toOrder(record: OrderLike): Order {
  return {
    id: String(record._id),
    customerId: String(record.customerId),
    items: record.items,
    totalAmount: record.totalAmount,
    status: record.status,
    trackingNumber: record.trackingNumber ?? undefined,
    shippingAddress: record.shippingAddress,
    completedAt: record.completedAt ? toIsoString(record.completedAt) : undefined,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toIsoString(value?: Date) {
  return (value ?? new Date()).toISOString();
}
