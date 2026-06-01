export type AgentConversationMessage = {
  content: string;
  direction: "inbound" | "outbound";
};

export type AgentConversationFacts = {
  customerName?: string;
  email?: string;
  phone?: string;
  productName?: string;
  quantity?: number;
  shippingAddress?: string;
  lastRequestedField?: "customerName" | "emailAddress" | "phoneNumber" | "orderDetails" | "shippingAddress";
};

export type AgentRuntimeInput = {
  question: string;
  context: string;
  authorId?: string;
  authorName?: string;
  channelId?: string;
  history?: AgentConversationMessage[];
  facts?: AgentConversationFacts;
};

export type AgentRuntime = (input: AgentRuntimeInput) => Promise<string>;
