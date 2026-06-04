export const messageDirections = ["inbound", "outbound"] as const;
export type MessageDirection = (typeof messageDirections)[number];

export const messageStatuses = ["received", "sent", "answered", "failed"] as const;
export type MessageStatus = (typeof messageStatuses)[number];

export enum ThreadStatus {
  Open = "open",
  HumanTakeover = "human_takeover",
  Resolved = "resolved",
}

export const threadStatuses = Object.values(ThreadStatus);

export enum SessionStatus {
  Active = "active",
  Completed = "completed",
}

export const sessionStatuses = Object.values(SessionStatus);

export type CustomerMessage = {
  id: string;
  discordMessageId?: string;
  channelId: string;
  channelName?: string;
  authorId: string;
  authorName: string;
  content: string;
  direction: MessageDirection;
  status: MessageStatus;
  responseToMessageId?: string;
  aiGenerated: boolean;
  threadId?: string;
  threadStatus?: ThreadStatus;
  sessionId?: string;
  sessionStatus?: SessionStatus;
  createdAt: string;
  updatedAt: string;
};
