import {
  type ApiEnvelope,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "../../../shared/api/http";
import type { Customer, CustomerInput } from "../types";

export async function fetchCustomers(searchQuery?: string) {
  const params = new URLSearchParams({ limit: "200" });

  if (searchQuery?.trim()) {
    params.set("search", searchQuery.trim());
  }

  const response = await apiGet<ApiEnvelope<Customer[]>>(`/customers?${params.toString()}`);
  return response.data;
}

export async function createCustomer(input: CustomerInput) {
  const response = await apiPost<ApiEnvelope<Customer>>("/customers", normalizeCustomerInput(input));
  return response.data;
}

export async function updateCustomer(customerId: string, input: CustomerInput) {
  const response = await apiPatch<ApiEnvelope<Customer>>(
    `/customers/${customerId}`,
    normalizeCustomerInput(input)
  );
  return response.data;
}

export async function deleteCustomer(customerId: string) {
  const response = await apiDelete<ApiEnvelope<{ id: string; deletedOrderCount: number }>>(
    `/customers/${customerId}`
  );
  return response.data;
}

function normalizeCustomerInput(input: CustomerInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || undefined,
    discordId: input.discordId?.trim() || undefined,
  };
}
