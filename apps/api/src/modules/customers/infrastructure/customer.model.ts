import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

const customerSchema = new Schema(
  {
    discordId: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export type CustomerRecord = InferSchemaType<typeof customerSchema>;
export type CustomerDocument = HydratedDocument<CustomerRecord>;

export const CustomerModel =
  models.Customer || model<CustomerRecord>("Customer", customerSchema);
