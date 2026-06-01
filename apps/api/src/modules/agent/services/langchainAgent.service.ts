import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { CommandModel } from "../models/command.model";
import type { AgentRuntimeInput } from "../types/agentRuntime";
import { commandDefinitions } from "../tools/commandRegistry";

export async function runLangchainAgent(input: AgentRuntimeInput): Promise<string> {
  const enabledCommandsFromDb = await CommandModel.find({ enabled: true }).lean();

  const langchainTools: DynamicStructuredTool[] = [];

  for (const dbCmd of enabledCommandsFromDb) {
    const registryDef = commandDefinitions[dbCmd.name];
    if (!registryDef) {
      logger.warn(`Command '${dbCmd.name}' is enabled in DB, but no implementation was found.`);
      continue;
    }

    const dynamicTool = new DynamicStructuredTool({
      name: registryDef.name,
      description: registryDef.description,
      schema: registryDef.schema,
      func: async (args) => {
        try {
          const result = await registryDef.execute(args);
          return JSON.stringify(toSafeToolResult(registryDef.name, result));
        } catch (error) {
          logger.error(`Error in tool execution for '${registryDef.name}'`, { error });
          return JSON.stringify(toPrivateToolFailure(registryDef.name));
        }
      }
    });

    langchainTools.push(dynamicTool);
  }

  let model: ChatOpenAI;

  if (env.OPENROUTER_API_KEY) {
    model = new ChatOpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      modelName: env.OPENROUTER_MODEL,
      temperature: 0.2,
      configuration: {
        baseURL: env.OPENROUTER_BASE_URL,
        defaultHeaders: {
          "HTTP-Referer": env.CLIENT_ORIGIN,
          "X-Title": "Closiq Discord Agent (LangChain)",
        },
      },
    });
  } else if (env.OPENAI_API_KEY) {
    model = new ChatOpenAI({
      apiKey: env.OPENAI_API_KEY,
      modelName: env.OPENAI_MODEL,
      temperature: 0.2,
    });
  } else {
    return "LangChain Agent Mode: No OpenAI or OpenRouter API key found in your environment variables. Please configure your .env file.";
  }

  const modelWithTools = langchainTools.length > 0
    ? model.bindTools(langchainTools)
    : model;

  let userContextPrompt = "";
  if (input.authorId && input.authorName) {
    userContextPrompt = `\n\nCURRENT REQUEST PAYLOAD:
- Name: ${input.authorName}
- Discord ID: ${input.authorId}
If they ask about their profile, orders, or registration, silently use the Discord ID for lookups and customer linking.`;
  }
  if (input.channelId) {
    userContextPrompt += `\n- Current Channel/Thread ID: ${input.channelId}`;
  }
  if (input.facts) {
    userContextPrompt += `\n\nCONVERSATION FACTS FROM PAYLOAD AND THREAD HISTORY:
${JSON.stringify(removeEmptyFacts(input.facts), null, 2)}
Use these facts before asking the customer for information. If the customer just answered a question you asked, treat the latest message as that answer.`;
  }

  const systemPrompt = `You are Closiq's Discord support agent running on LangChain. Answer customers concisely, helpfully, and friendly. Use the supplied knowledgebase context to answer their questions accurately. If no context is provided or if the context is insufficient, answer to the best of your ability using your general knowledge while remaining helpful.

You also have direct access to tools to manage customer records and order statuses. You can create, read, update, and delete customers, as well as fetch and update their orders. When updating order status, ensure you only use valid statuses: pending, processing, shipped, delivered, or cancelled.

Customer-facing safety rules:
- Never mention tools, databases, internal systems, errors, technical issues, retries, hiccups, failures, exceptions, or implementation details to customers.
- If a tool result says an action was not completed, do not describe that result. Continue from the known facts or ask only for the next missing required field.
- Do not ask for optional fields as a workaround. Phone is optional for customer creation.
- To create a customer, the required fields are name and email. Use the current Discord ID silently when available.
- To create an order, the required fields are customerId, item name, quantity, and shipping address.
- If CONVERSATION FACTS already contain the needed value, do not ask for it again.
- If the customer replied with a short name after you asked for their name, use that as the customer name.${userContextPrompt}`;

  const messages: any[] = [
    new SystemMessage(systemPrompt),
  ];

  if (input.history && input.history.length > 0) {
    for (const h of input.history) {
      if (h.direction === "inbound") {
        messages.push(new HumanMessage(h.content));
      } else {
        messages.push(new AIMessage(h.content));
      }
    }
  }

  messages.push(
    new HumanMessage(`Customer message:\n${input.question}\n\nKnowledgebase context:\n${input.context}`)
  );

  let runCount = 0;
  const maxRuns = 6;

  while (runCount < maxRuns) {
    runCount++;

    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    if (response.additional_kwargs.tool_calls && response.additional_kwargs.tool_calls.length > 0) {
      const toolCalls = response.additional_kwargs.tool_calls;

      for (const tc of toolCalls) {
        const toolName = tc.function.name;
        const toolId = tc.id;
        const toolArgsStr = tc.function.arguments;

        const tool = langchainTools.find((t) => t.name === toolName);
        let output: string;

        if (!tool) {
          output = JSON.stringify({ success: false, message: `Tool ${toolName} is not registered.` });
        } else {
          try {
            const parsedArgs = JSON.parse(toolArgsStr);
            output = await tool.invoke(parsedArgs);
          } catch (error) {
            logger.error(`Failed to execute tool ${toolName}`, { error });
            output = JSON.stringify(toPrivateToolFailure(toolName));
          }
        }

        messages.push(new ToolMessage({
          content: output,
          tool_call_id: toolId,
          name: toolName,
        }));
      }
    } else {
      return typeof response.content === "string"
        ? sanitizeCustomerAnswer(response.content, input)
        : buildSafeFallback(input);
    }
  }

  const lastResponse = messages[messages.length - 1];
  if (lastResponse && typeof lastResponse.content === "string") {
    return sanitizeCustomerAnswer(lastResponse.content, input);
  }

  return buildSafeFallback(input);
}

function toSafeToolResult(toolName: string, result: any) {
  if (!result || result.success !== false) {
    return result;
  }

  if (result.error || containsUnsafeOperationalDetail(result.message)) {
    return toPrivateToolFailure(toolName);
  }

  return result;
}

function toPrivateToolFailure(toolName: string) {
  return {
    success: false,
    code: `${toScreamingSnakeCase(toolName)}_NOT_COMPLETED`,
    nextStepPolicy:
      "Do not mention this result. Use known conversation facts or ask only for missing required fields.",
  };
}

function sanitizeCustomerAnswer(answer: string, input: AgentRuntimeInput) {
  if (!containsUnsafeOperationalDetail(answer)) {
    return answer;
  }

  logger.warn("Blocked unsafe customer-facing agent answer", {
    answer,
    channelId: input.channelId,
    authorId: input.authorId,
  });

  return buildSafeFallback(input);
}

function buildSafeFallback(input: AgentRuntimeInput) {
  const name = input.facts?.customerName ? `, ${input.facts.customerName}` : "";
  const missingField = getNextMissingRequiredField(input);

  if (missingField) {
    return `Thanks${name}. Could you please provide your ${missingField}?`;
  }

  return `Thanks${name}. I have the details I need and will continue from here.`;
}

function getNextMissingRequiredField(input: AgentRuntimeInput) {
  const facts = input.facts;

  if (!facts?.email) {
    return "email address";
  }

  if (!facts.customerName) {
    return "full name";
  }

  if (!facts.productName || !facts.quantity) {
    return "item and quantity";
  }

  if (!facts.shippingAddress) {
    return "delivery address";
  }

  return null;
}

function containsUnsafeOperationalDetail(value?: string) {
  if (!value) {
    return false;
  }

  return /\b(?:technical|hiccup|database|error|exception|failed|failure|retry|bypass|internal|system|tool|mongoose|mongodb|having trouble|not giving up)\b/i.test(
    value
  );
}

function removeEmptyFacts<T extends Record<string, unknown>>(facts: T) {
  return Object.fromEntries(
    Object.entries(facts).filter(([, value]) => value !== undefined && value !== "")
  );
}

function toScreamingSnakeCase(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toUpperCase();
}
