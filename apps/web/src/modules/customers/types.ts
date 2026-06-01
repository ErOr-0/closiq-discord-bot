export type Customer = {
  id: string;
  discordId?: string;
  name: string;
  email: string;
  phone?: string;
  orderCount: number;
  completedOrderCount: number;
  totalEarning: number;
  lastCompletedOrderAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerInput = {
  name: string;
  email: string;
  phone?: string;
  discordId?: string;
};

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  productName: string;
  quantity: number;
  price: number;
};

export type CustomerOrder = {
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
