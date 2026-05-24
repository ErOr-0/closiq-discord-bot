import { DynamicStructuredTool } from "@langchain/core/tools";
import { CommandModel } from "./command.model";
import { commandDefinitions } from "./commandRegistry";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";

export async function runLangchainAgent(input: {
  question: string;
  context: string;
  authorId?: string;
  authorName?: string;
}): Promise<string> {
  // 1. Fetch available commands from MongoDB (our lookup table)
  const enabledCommandsFromDb = await CommandModel.find({ enabled: true }).lean();

  // 2. Dynamically construct LangChain Structured Tools for those enabled commands
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
          return JSON.stringify(result);
        } catch (error) {
          logger.error(`Error in tool execution for '${registryDef.name}'`, { error });
          return JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
    });

    langchainTools.push(dynamicTool);
  }

  // 3. Initialize the LangChain OpenAI/OpenRouter model
  let model: ChatOpenAI;

  if (env.OPENROUTER_API_KEY) {
    model = new ChatOpenAI({
      openAIApiKey: env.OPENROUTER_API_KEY,
      modelName: env.OPENROUTER_MODEL,
      temperature: 0.2,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": env.CLIENT_ORIGIN,
          "X-Title": "Closiq Discord Agent (LangChain)",
        },
      },
    });
  } else if (env.OPENAI_API_KEY) {
    model = new ChatOpenAI({
      openAIApiKey: env.OPENAI_API_KEY,
      modelName: env.OPENAI_MODEL,
      temperature: 0.2,
    });
  } else {
    return "LangChain Agent Mode: No OpenAI or OpenRouter API key found in your environment variables. Please configure your .env file.";
  }

  // 4. Bind our dynamically constructed tools to the LangChain model
  const modelWithTools = langchainTools.length > 0
    ? model.bindTools(langchainTools)
    : model;

  // 5. Construct our system context and initial prompt
  let userContextPrompt = "";
  if (input.authorId && input.authorName) {
    userContextPrompt = `\n\nCURRENT USER DISCORD INFO:
- Name: ${input.authorName}
- Discord ID: ${input.authorId}
If they ask about their profile, orders, or registration, you should look up their profile using "get_customer_by_discord_id" with their Discord ID. If they don't have a profile yet, you can create one for them using "create_customer" after asking or confirming their email.`;
  }

  const systemPrompt = `You are Closiq's Discord support agent running on LangChain. Answer customers concisely, helpfully, and friendly. Use the supplied knowledgebase context to answer their questions accurately. If no context is provided or if the context is insufficient, answer to the best of your ability using your general knowledge while remaining helpful.

You also have direct access to tools to manage customer records and order statuses. You can create, read, update, and delete customers, as well as fetch and update their orders. When updating order status, ensure you only use valid statuses: pending, processing, shipped, delivered, or cancelled.${userContextPrompt}`;

  const messages: any[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`Customer message:\n${input.question}\n\nKnowledgebase context:\n${input.context}`),
  ];

  // 6. Run the agentic ReAct loop
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
            output = JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) });
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
        ? response.content
        : "Hello! I am having trouble forming a response right now.";
    }
  }

  const lastResponse = messages[messages.length - 1];
  if (lastResponse && typeof lastResponse.content === "string") {
    return lastResponse.content;
  }

  return "Hello! I am having trouble connecting to my brain right now. Please try again or ask a human teammate for help.";
}
