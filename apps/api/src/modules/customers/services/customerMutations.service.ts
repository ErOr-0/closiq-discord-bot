import mongoose from "mongoose";

import { AppError } from "../../../shared/errors/AppError";
import { OrderModel } from "../../orders/models/order.model";
import { CustomerModel } from "../models/customer.model";
import { type CustomerSummary } from "../types/customer";
import { type CustomerLike, toCustomerSummary } from "../mappers/customer.mapper";
import { getCustomerOrderSummary } from "./customerOrderSummary.service";

export type CustomerInput = {
  name: string;
  email: string;
  phone?: string;
  discordId?: string;
};

export type CustomerUpdateInput = Partial<CustomerInput>;

export async function createCustomer(input: CustomerInput): Promise<CustomerSummary> {
  await assertCustomerIsUnique(input.email, input.discordId);

  const customer = await CustomerModel.create({
    ...input,
    email: input.email.toLowerCase(),
  });

  return toCustomerSummary(customer.toObject(), {
    completedOrderCount: 0,
    orderCount: 0,
    totalEarning: 0,
  });
}

export async function updateCustomer(
  customerId: string,
  input: CustomerUpdateInput
): Promise<CustomerSummary> {
  assertValidCustomerId(customerId);
  await assertCustomerIsUnique(input.email, input.discordId, customerId);

  const updates: Record<string, string> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.email !== undefined) updates.email = input.email.toLowerCase();
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.discordId !== undefined) updates.discordId = input.discordId;

  const customer = (await CustomerModel.findByIdAndUpdate(customerId, updates, {
    new: true,
  }).lean()) as unknown as CustomerLike | null;

  if (!customer) {
    throw new AppError("Customer not found.", 404);
  }

  const orderSummary = await getCustomerOrderSummary(customerId);

  return toCustomerSummary(customer, orderSummary);
}

export async function deleteCustomer(customerId: string) {
  assertValidCustomerId(customerId);

  const deletedCustomer = await CustomerModel.findByIdAndDelete(customerId).lean();

  if (!deletedCustomer) {
    throw new AppError("Customer not found.", 404);
  }

  const orderResult = await OrderModel.deleteMany({ customerId });

  return {
    id: customerId,
    deletedOrderCount: orderResult.deletedCount,
  };
}

function assertValidCustomerId(customerId: string) {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new AppError("Invalid customer ID format.", 400);
  }
}

async function assertCustomerIsUnique(
  email?: string,
  discordId?: string,
  ignoredCustomerId?: string
) {
  const filters = [];

  if (email) {
    filters.push({ email: email.toLowerCase() });
  }

  if (discordId) {
    filters.push({ discordId });
  }

  if (filters.length === 0) {
    return;
  }

  const existingCustomer = (await CustomerModel.findOne({
    $or: filters,
    ...(ignoredCustomerId ? { _id: { $ne: ignoredCustomerId } } : {}),
  }).lean()) as unknown as CustomerLike | null;

  if (!existingCustomer) {
    return;
  }

  if (email && existingCustomer.email === email.toLowerCase()) {
    throw new AppError(`A customer with email ${email} already exists.`, 409);
  }

  throw new AppError("A customer with that Discord ID already exists.", 409);
}
