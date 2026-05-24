import { runLangchainAgent } from "../infrastructure/langchainAgent";
import { searchKnowledge } from "../../knowledgebase/application/searchKnowledge.usecase";
import type { AgentAnswer } from "../domain/agentAnswer";

export async function answerCustomerMessage(input: {
  message: string;
  authorId?: string;
  authorName?: string;
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

  const answer = await runLangchainAgent({
    question: input.message,
    context,
    authorId: input.authorId,
    authorName: input.authorName,
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
