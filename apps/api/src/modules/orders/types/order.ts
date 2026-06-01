export const orderStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export type OrderItem = {
  productName: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  trackingNumber?: string;
  shippingAddress: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};
