import { searchKnowledge } from "../../knowledgebase/services/searchKnowledge.service";
import { listThreadHistory } from "../../messages/services/listThreadHistory.service";
import type { AgentAnswer } from "../types/agentAnswer";
import {
  buildConversationFacts,
  removeCurrentMessageFromHistory,
} from "./conversationFacts.service";
import { runLangchainAgent } from "./langchainAgent.service";

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

  const rawHistory = input.channelId
    ? await listThreadHistory({ channelId: input.channelId, limit: 40 })
    : [];
  const history = removeCurrentMessageFromHistory(rawHistory, input.message);
  const facts = buildConversationFacts(
    history,
    { content: input.message, direction: "inbound" },
    { authorName: input.authorName }
  );

  const answer = await runLangchainAgent({
    question: input.message,
    context,
    authorId: input.authorId,
    authorName: input.authorName,
    channelId: input.channelId,
    history,
    facts,
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
