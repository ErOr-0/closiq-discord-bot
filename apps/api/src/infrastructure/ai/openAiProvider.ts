import OpenAI from "openai";

import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { VECTOR_SIZE } from "../vector/qdrant";
import { agentTools } from "../../modules/agent/infrastructure/agentTools";

export type KnowledgeContext = {
  title: string;
  content: string;
  source?: string;
  score?: number;
};

// Use OpenAI's type definitions for safety and completeness
type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;
type ChatTool = OpenAI.Chat.ChatCompletionTool;

const openAiClient = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

const openRouterClient = env.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": env.CLIENT_ORIGIN,
        "X-Title": "Closiq Discord Agent",
      },
    })
  : null;

export async function createEmbedding(text: string): Promise<number[]> {
  if (!openAiClient) {
    return createDeterministicEmbedding(text);
  }

  const response = await openAiClient.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0]?.embedding ?? createDeterministicEmbedding(text);
}

export async function generateAgentAnswer(input: {
  question: string;
  matches: KnowledgeContext[];
  authorId?: string;
  authorName?: string;
}) {
  if (!openRouterClient && !openAiClient) {
    logger.warn("No chat AI provider is configured; returning deterministic development reply");
    return createDevelopmentReply(input.matches);
  }

  const context = input.matches.length
    ? input.matches
        .map((match, index) => {
          const source = match.source ? `\nSource: ${match.source}` : "";
          return `[${index + 1}] ${match.title}\n${match.content}${source}`;
        })
        .join("\n\n")
    : "No relevant knowledgebase context found.";

  // Build current user context if available
  let userContextPrompt = "";
  if (input.authorId && input.authorName) {
    userContextPrompt = `\n\nCURRENT USER DISCORD INFO:
- Name: ${input.authorName}
- Discord ID: ${input.authorId}
If they ask about their profile, orders, or registration, you should look up their profile using "get_customer_by_discord_id" with their Discord ID. If they don't have a profile yet, you can create one for them using "create_customer" after asking or confirming their email.`;
  }

  const systemPrompt = `You are Closiq's Discord support agent. Answer customers concisely, helpfully, and friendly. Use the supplied knowledgebase context to answer their questions accurately. If no context is provided or if the context is insufficient, answer to the best of your ability using your general knowledge while remaining helpful.

You also have direct access to tools to manage customer records and order statuses. You can create, read, update, and delete customers, as well as fetch and update their orders. When updating order status, ensure you only use valid statuses: pending, processing, shipped, delivered, or cancelled.${userContextPrompt}`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: `Customer message:\n${input.question}\n\nKnowledgebase context:\n${context}`,
    },
  ];

  const tools: ChatTool[] = Object.values(agentTools).map((tool) => tool.definition);

  let runCount = 0;
  const maxRuns = 6; // Limit agent steps to avoid infinite loops

  while (runCount < maxRuns) {
    runCount++;
    logger.info(`Running agent step ${runCount}/${maxRuns}...`);

    const assistantMessage = await generateChatCompletion(messages, tools);
    if (!assistantMessage) {
      break;
    }

    // Add assistant's message to history
    messages.push(assistantMessage);

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      logger.info(`Agent triggered ${assistantMessage.tool_calls.length} tool calls`, {
        toolCalls: assistantMessage.tool_calls.map((tc) => tc.function.name),
      });

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolId = toolCall.id;
        const toolArgsStr = toolCall.function.arguments;

        logger.info(`Executing tool ${toolName}...`, { toolArgs: toolArgsStr });

        let result: any;
        const tool = agentTools[toolName];
        if (!tool) {
          result = { success: false, message: `Tool ${toolName} is not registered.` };
        } else {
          try {
            const parsedArgs = JSON.parse(toolArgsStr);
            result = await tool.execute(parsedArgs);
          } catch (error) {
            logger.error(`Failed to execute tool ${toolName}`, { error });
            result = { success: false, error: error instanceof Error ? error.message : String(error) };
          }
        }

        messages.push({
          role: "tool",
          tool_call_id: toolId,
          content: JSON.stringify(result),
        });
      }
    } else {
      // No tools called, we are done!
      return typeof assistantMessage.content === "string"
        ? assistantMessage.content
        : "Hello! I am having trouble forming a reply right now.";
    }
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.role === "assistant" && typeof lastMessage.content === "string") {
    return lastMessage.content;
  }

  return "Hello! I am having trouble connecting to my brain right now. Please try again or ask a human teammate for help.";
}

async function generateChatCompletion(
  messages: ChatMessage[],
  tools?: ChatTool[]
): Promise<OpenAI.Chat.ChatCompletionMessage | undefined> {
  const attempts: Array<{
    provider: "openrouter" | "openai";
    client: OpenAI;
    model: string;
  }> = [];

  if (openRouterClient) {
    attempts.push({
      provider: "openrouter",
      client: openRouterClient,
      model: env.OPENROUTER_MODEL,
    });

    if (env.OPENROUTER_FALLBACK_MODEL && env.OPENROUTER_FALLBACK_MODEL !== env.OPENROUTER_MODEL) {
      attempts.push({
        provider: "openrouter",
        client: openRouterClient,
        model: env.OPENROUTER_FALLBACK_MODEL,
      });
    }
  }

  if (openAiClient) {
    attempts.push({
      provider: "openai",
      client: openAiClient,
      model: env.OPENAI_MODEL,
    });
  }

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const response = await attempt.client.chat.completions.create({
        model: attempt.model,
        temperature: 0.2,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
      });

      return response.choices[0]?.message;
    } catch (error) {
      lastError = error;
      logger.warn("AI chat completion failed; trying next configured model if available", {
        provider: attempt.provider,
        model: attempt.model,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.error("All configured AI chat completion attempts failed", {
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });

  return undefined;
}

function createDevelopmentReply(matches: KnowledgeContext[]) {
  const summaries = matches
    .slice(0, 3)
    .map((match, index) => `${index + 1}. ${match.title}: ${match.content.slice(0, 220)}`)
    .join("\n");

  return `I found these relevant knowledgebase notes:\n${summaries}\n\nConfigure OPENROUTER_API_KEY or OPENAI_API_KEY to generate natural AI replies.`;
}

function createDeterministicEmbedding(text: string) {
  const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  for (const token of tokens) {
    const index = hash(token) % VECTOR_SIZE;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

function hash(value: string) {
  let result = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}
