import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

import { orderStatuses } from "../types/order";

const orderItemSchema = new Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

const orderSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [
        (val: unknown[]) => val.length > 0,
        "An order must have at least one item.",
      ],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: orderStatuses,
      default: "pending",
      required: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    shippingAddress: {
      type: String,
      required: true,
      trim: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ completedAt: -1 });

export type OrderRecord = InferSchemaType<typeof orderSchema>;
export type OrderDocument = HydratedDocument<OrderRecord>;

export const OrderModel =
  models.Order || model<OrderRecord>("Order", orderSchema);
