export type AgentConversationMessage = {
  content: string;
  direction: "inbound" | "outbound";
};

export type AgentRuntimeInput = {
  question: string;
  context: string;
  authorId?: string;
  authorName?: string;
  channelId?: string;
  history?: AgentConversationMessage[];
};

export type AgentRuntime = (input: AgentRuntimeInput) => Promise<string>;
