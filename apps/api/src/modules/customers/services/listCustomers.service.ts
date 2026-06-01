import { CustomerModel } from "../models/customer.model";
import { type CustomerSummary } from "../types/customer";
import { type CustomerLike, toCustomerSummary } from "../mappers/customer.mapper";
import { getCustomerOrderSummaryMap } from "./customerOrderSummary.service";

type ListCustomersInput = {
  limit?: number;
  search?: string;
};

export async function listCustomers(input: ListCustomersInput = {}): Promise<CustomerSummary[]> {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
  const filter = buildCustomerFilter(input.search);
  const customers = (await CustomerModel.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()) as unknown as CustomerLike[];
  const customerIds = customers.map((customer) => customer._id);

  const orderSummaries = await getCustomerOrderSummaryMap(customerIds);

  return customers.map((customer) =>
    toCustomerSummary(customer, orderSummaries.get(String(customer._id)))
  );
}

function buildCustomerFilter(search?: string) {
  const trimmedSearch = search?.trim();

  if (!trimmedSearch) {
    return {};
  }

  const pattern = new RegExp(escapeRegExp(trimmedSearch), "i");

  return {
    $or: [
      { name: pattern },
      { email: pattern },
      { phone: pattern },
      { discordId: pattern },
    ],
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
