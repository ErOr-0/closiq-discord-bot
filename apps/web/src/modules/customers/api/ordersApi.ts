import { type ApiEnvelope, apiGet, apiPatch } from "../../../shared/api/http";
import type { CustomerOrder } from "../types";

export async function fetchCustomerOrders(customerId: string) {
  const response = await apiGet<ApiEnvelope<CustomerOrder[]>>(`/orders?customerId=${customerId}`);
  return response.data;
}

export async function completeCustomerOrder(orderId: string) {
  const response = await apiPatch<ApiEnvelope<CustomerOrder>>(`/orders/${orderId}/complete`, {});
  return response.data;
}
