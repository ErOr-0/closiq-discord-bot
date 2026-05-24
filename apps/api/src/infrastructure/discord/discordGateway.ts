import { Client, Events, GatewayIntentBits, Partials, type Message } from "discord.js";

import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { answerCustomerMessage } from "../../modules/agent/application/answerCustomerMessage.usecase";
import { markMessageAnswered, recordMessage } from "../../modules/messages/application/recordMessage.usecase";

export async function startDiscordGateway() {
  if (!env.DISCORD_BOT_TOKEN) {
    logger.warn("DISCORD_BOT_TOKEN is not configured; Discord gateway disabled");
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info("Discord gateway connected", {
      username: readyClient.user.tag,
      guildId: env.DISCORD_GUILD_ID,
      supportChannelId: env.DISCORD_SUPPORT_CHANNEL_ID,
    });
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleMessage(message);
    } catch (error) {
      logger.error("Discord message handling failed", {
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  await client.login(env.DISCORD_BOT_TOKEN);

  return client;
}

async function handleMessage(message: Message) {
  if (message.author.bot) {
    return;
  }

  if (env.DISCORD_SUPPORT_CHANNEL_ID && message.channelId !== env.DISCORD_SUPPORT_CHANNEL_ID) {
    return;
  }

  if (!message.content.trim()) {
    return;
  }

  const inbound = await recordMessage({
    discordMessageId: message.id,
    channelId: message.channelId,
    authorId: message.author.id,
    authorName: message.author.username,
    content: message.content,
    direction: "inbound",
    status: "received",
  });

  if (!env.AUTO_REPLY_ENABLED) {
    return;
  }

  const agentResponse = await answerCustomerMessage({
    message: message.content,
    authorId: message.author.id,
    authorName: message.author.username,
  });
  const replyContent = agentResponse.answer.slice(0, 1900);

  const reply = await message.reply({
    content: replyContent,
    allowedMentions: {
      repliedUser: false,
    },
  });

  await recordMessage({
    discordMessageId: reply.id,
    channelId: reply.channelId,
    authorId: reply.author.id,
    authorName: reply.author.username,
    content: replyContent,
    direction: "outbound",
    status: "sent",
    responseToMessageId: inbound.id,
    aiGenerated: true,
  });

  await markMessageAnswered(inbound.id);
}
