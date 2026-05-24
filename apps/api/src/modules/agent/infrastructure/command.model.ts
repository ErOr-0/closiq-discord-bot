import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";
import { commandDefinitions } from "./commandRegistry";
import { logger } from "../../../config/logger";

const commandSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    parameters: {
      type: Schema.Types.Mixed, // JSON schema for parameters
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export type CommandRecord = InferSchemaType<typeof commandSchema>;
export type CommandDocument = HydratedDocument<CommandRecord>;

export const CommandModel =
  models.Command || model<CommandRecord>("Command", commandSchema);

export async function seedCommands() {
  try {
    const count = await CommandModel.countDocuments();
    if (count > 0) {
      logger.info(`Command Lookup Table already seeded with ${count} commands.`);
      return;
    }

    logger.info("Seeding Command Lookup Table with available agent tools...");
    const seeds = Object.values(commandDefinitions).map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      parameters: cmd.parameters,
      enabled: true,
    }));

    await CommandModel.insertMany(seeds);
    logger.info(`Successfully seeded ${seeds.length} commands into MongoDB.`);
  } catch (error) {
    logger.error("Failed to seed Command Lookup Table", { error });
  }
}
