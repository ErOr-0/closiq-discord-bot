import { z } from "zod";
import mongoose from "mongoose";
import { CustomerModel } from "../../customers/infrastructure/customer.model";
import { OrderModel } from "../../orders/infrastructure/order.model";
import { logger } from "../../../config/logger";

export interface CommandDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON schema
  schema: z.ZodObject<any>;
  execute: (args: any) => Promise<any>;
}

export const commandDefinitions: Record<string, CommandDefinition> = {
  get_customer_by_discord_id: {
    name: "get_customer_by_discord_id",
    description: "Retrieve a customer profile using their Discord user ID. Helpful to see if the customer already has an account mapped to their Discord.",
    parameters: {
      type: "object",
      properties: {
        discordId: {
          type: "string",
          description: "The Discord user ID (e.g. '123456789012345678')",
        },
      },
      required: ["discordId"],
    },
    schema: z.object({
      discordId: z.string().describe("The Discord user ID"),
    }),
    execute: async ({ discordId }) => {
      try {
        const customer = await CustomerModel.findOne({ discordId }).lean();
        if (!customer) {
          return { success: false, message: `No customer found with Discord ID: ${discordId}` };
        }
        return { success: true, customer };
      } catch (error) {
        logger.error("Error in get_customer_by_discord_id command", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },

  get_customer_by_email: {
    name: "get_customer_by_email",
    description: "Retrieve customer details by their email address.",
    parameters: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "The customer's email address (e.g. 'john@example.com')",
        },
      },
      required: ["email"],
    },
    schema: z.object({
      email: z.string().email().describe("The customer's email address"),
    }),
    execute: async ({ email }) => {
      try {
        const customer = await CustomerModel.findOne({ email: email.toLowerCase() }).lean();
        if (!customer) {
          return { success: false, message: `No customer found with email: ${email}` };
        }
        return { success: true, customer };
      } catch (error) {
        logger.error("Error in get_customer_by_email command", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },

  create_customer: {
    name: "create_customer",
    description: "Create a new customer profile in the database.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name of the customer" },
        email: { type: "string", description: "Email address of the customer" },
        phone: { type: "string", description: "Optional phone number" },
        discordId: { type: "string", description: "Optional Discord user ID to link to their profile" },
      },
      required: ["name", "email"],
    },
    schema: z.object({
      name: z.string().describe("Full name of the customer"),
      email: z.string().email().describe("Email address of the customer"),
      phone: z.string().optional().describe("Optional phone number"),
      discordId: z.string().optional().describe("Optional Discord user ID"),
    }),
    execute: async ({ name, email, phone, discordId }) => {
      try {
        const existing = await CustomerModel.findOne({ email: email.toLowerCase() });
        if (existing) {
          return { success: false, message: `A customer with email ${email} already exists.` };
        }
        const customer = await CustomerModel.create({
          name,
          email: email.toLowerCase(),
          phone,
          discordId,
        });
        return { success: true, message: "Customer created successfully", customer };
      } catch (error) {
        logger.error("Error in create_customer command", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },

  update_customer: {
    name: "update_customer",
    description: "Update an existing customer's details (name, email, phone, or discordId).",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The database ID of the customer (24-char hex string)" },
        name: { type: "string", description: "New name of the customer" },
        email: { type: "string", description: "New email address of the customer" },
        phone: { type: "string", description: "New phone number" },
        discordId: { type: "string", description: "New Discord user ID to associate" },
      },
      required: ["customerId"],
    },
    schema: z.object({
      customerId: z.string().describe("The database ID of the customer"),
      name: z.string().optional().describe("New name of the customer"),
      email: z.string().email().optional().describe("New email address"),
      phone: z.string().optional().describe("New phone number"),
      discordId: z.string().optional().describe("New Discord user ID"),
    }),
    execute: async ({ customerId, name, email, phone, discordId }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
          return { success: false, message: "Invalid customer ID format. Must be a 24-char hex string." };
        }
        const updates: Record<string, any> = {};
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email.toLowerCase();
        if (phone !== undefined) updates.phone = phone;
        if (discordId !== undefined) updates.discordId = discordId;

        const customer = await CustomerModel.findByIdAndUpdate(customerId, updates, { new: true }).lean();
        if (!customer) {
          return { success: false, message: "Customer not found." };
        }
        return { success: true, message: "Customer updated successfully", customer };
      } catch (error) {
        logger.error("Error in update_customer command", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },

  delete_customer: {
    name: "delete_customer",
    description: "Delete a customer profile and optionally their orders from the database.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The database ID of the customer (24-char hex string)" },
      },
      required: ["customerId"],
    },
    schema: z.object({
      customerId: z.string().describe("The database ID of the customer"),
    }),
    execute: async ({ customerId }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
          return { success: false, message: "Invalid customer ID format." };
        }
        const deletedCustomer = await CustomerModel.findByIdAndDelete(customerId);
        if (!deletedCustomer) {
          return { success: false, message: "Customer not found." };
        }
        const deleteOrdersResult = await OrderModel.deleteMany({ customerId });
        return {
          success: true,
          message: `Customer and their ${deleteOrdersResult.deletedCount} orders deleted successfully.`,
        };
      } catch (error) {
        logger.error("Error in delete_customer command", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },

  list_customer_orders: {
    name: "list_customer_orders",
    description: "List all orders made by a specific customer.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The customer's database ID" },
      },
      required: ["customerId"],
    },
    schema: z.object({
      customerId: z.string().describe("The customer's database ID"),
    }),
    execute: async ({ customerId }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
          return { success: false, message: "Invalid customer ID format." };
        }
        const orders = await OrderModel.find({ customerId }).sort({ createdAt: -1 }).lean();
        return { success: true, ordersCount: orders.length, orders };
      } catch (error) {
        logger.error("Error in list_customer_orders command", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },

  get_order_by_id: {
    name: "get_order_by_id",
    description: "Get comprehensive details of a specific order by its Order ID.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "The order's database ID (24-char hex string)" },
      },
      required: ["orderId"],
    },
    schema: z.object({
      orderId: z.string().describe("The order's database ID"),
    }),
    execute: async ({ orderId }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
          return { success: false, message: "Invalid order ID format." };
        }
        const order = await OrderModel.findById(orderId).populate("customerId", "name email").lean();
        if (!order) {
          return { success: false, message: `No order found with ID: ${orderId}` };
        }
        return { success: true, order };
      } catch (error) {
        logger.error("Error in get_order_by_id command", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },

  create_order: {
    name: "create_order",
    description: "Create a new product order for a customer.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The database ID of the customer placing this order" },
        items: {
          type: "array",
          description: "List of items in the order",
          items: {
            type: "object",
            properties: {
              productName: { type: "string", description: "Name of the product" },
              quantity: { type: "number", description: "Quantity of the product" },
              price: { type: "number", description: "Price per unit of the product" },
            },
            required: ["productName", "quantity", "price"],
          },
        },
        shippingAddress: { type: "string", description: "Full shipping address for delivery" },
      },
      required: ["customerId", "items", "shippingAddress"],
    },
    schema: z.object({
      customerId: z.string().describe("The database ID of the customer"),
      items: z.array(
        z.object({
          productName: z.string().describe("Name of the product"),
          quantity: z.number().int().positive().describe("Quantity of the product"),
          price: z.number().nonnegative().describe("Price per unit"),
        })
      ).describe("List of items in the order"),
      shippingAddress: z.string().describe("Full shipping address"),
    }),
    execute: async ({ customerId, items, shippingAddress }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
          return { success: false, message: "Invalid customer ID format." };
        }
        const customer = await CustomerModel.findById(customerId);
        if (!customer) {
          return { success: false, message: "Customer not found. Cannot place an order for a non-existent customer." };
        }

        const totalAmount = items.reduce(
          (sum: number, item: any) => sum + item.quantity * item.price,
          0
        );

        const order = await OrderModel.create({
          customerId,
          items,
          totalAmount,
          shippingAddress,
          status: "pending",
        });

        return { success: true, message: "Order placed successfully", orderId: order._id, order };
      } catch (error) {
        logger.error("Error in create_order command", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },

  update_order_status: {
    name: "update_order_status",
    description: "Update an order's fulfillment status (pending, processing, shipped, delivered, cancelled) and optionally set a tracking number.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "The database ID of the order" },
        status: {
          type: "string",
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
          description: "The new status of the order",
        },
        trackingNumber: { type: "string", description: "Optional tracking number if shipped" },
      },
      required: ["orderId", "status"],
    },
    schema: z.object({
      orderId: z.string().describe("The database ID of the order"),
      status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).describe("The new status of the order"),
      trackingNumber: z.string().optional().describe("Optional tracking number"),
    }),
    execute: async ({ orderId, status, trackingNumber }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
          return { success: false, message: "Invalid order ID format." };
        }
        const updates: Record<string, any> = { status };
        if (trackingNumber !== undefined) {
          updates.trackingNumber = trackingNumber;
        }

        const order = await OrderModel.findByIdAndUpdate(orderId, updates, { new: true }).populate("customerId", "name email").lean();
        if (!order) {
          return { success: false, message: `No order found with ID: ${orderId}` };
        }
        return { success: true, message: `Order status updated to ${status} successfully`, order };
      } catch (error) {
        logger.error("Error in update_order_status command", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },
};
