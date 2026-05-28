import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";
import { commandDefinitions } from "../tools/commandRegistry";
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
    logger.info("Syncing Command Lookup Table with available agent tools...");
    for (const cmd of Object.values(commandDefinitions)) {
      await CommandModel.updateOne(
        { name: cmd.name },
        {
          $setOnInsert: { enabled: true },
          $set: {
            description: cmd.description,
            parameters: cmd.parameters,
          },
        },
        { upsert: true }
      );
    }
    logger.info("Successfully synced agent commands in MongoDB.");
  } catch (error) {
    logger.error("Failed to sync Command Lookup Table", { error });
  }
}
