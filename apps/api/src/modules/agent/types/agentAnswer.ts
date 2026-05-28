export type AgentCitation = {
  id: string;
  title: string;
  source?: string;
  score?: number;
};

export type AgentAnswer = {
  answer: string;
  citations: AgentCitation[];
};
