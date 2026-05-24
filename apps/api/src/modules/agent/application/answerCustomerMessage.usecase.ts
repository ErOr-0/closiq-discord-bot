import { runLangchainAgent } from "../infrastructure/langchainAgent";
import { searchKnowledge } from "../../knowledgebase/application/searchKnowledge.usecase";
import { ThreadModel, MessageModel } from "../../messages/infrastructure/message.model";
import type { AgentAnswer } from "../domain/agentAnswer";

export async function answerCustomerMessage(input: {
  message: string;
  authorId?: string;
  authorName?: string;
  channelId?: string;
}): Promise<AgentAnswer> {
  const matches = await searchKnowledge({ query: input.message, limit: 5 });

  const context = matches.length
    ? matches
        .map((match, index) => {
          const source = match.source ? `\nSource: ${match.source}` : "";
          return `[${index + 1}] ${match.title}\n${match.content}${source}`;
        })
        .join("\n\n")
    : "No relevant knowledgebase context found.";

  // Fetch conversation history from the active thread if channelId is provided
  let history: Array<{ content: string; direction: "inbound" | "outbound" }> = [];
  if (input.channelId) {
    const activeThread = await ThreadModel.findOne({ channelId: input.channelId, status: "open" });
    if (activeThread) {
      const threadMessages = await MessageModel.find({ threadId: String(activeThread._id) })
        .sort({ createdAt: 1 })
        .limit(40)
        .lean();

      history = threadMessages.map((m) => ({
        content: m.content,
        direction: m.direction as "inbound" | "outbound",
      }));
    }
  }

  const answer = await runLangchainAgent({
    question: input.message,
    context,
    authorId: input.authorId,
    authorName: input.authorName,
    channelId: input.channelId,
    history,
  });

  return {
    answer,
    citations: matches.map((match) => ({
      id: match.id,
      title: match.title,
      source: match.source,
      score: match.score,
    })),
  };
}
