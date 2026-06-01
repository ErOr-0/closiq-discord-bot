export type Customer = {
  id: string;
  discordId?: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerSummary = Customer & {
  orderCount: number;
  completedOrderCount: number;
  totalEarning: number;
  lastCompletedOrderAt?: string;
};
