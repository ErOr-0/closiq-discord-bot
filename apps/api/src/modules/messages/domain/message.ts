export const messageDirections = ["inbound", "outbound"] as const;
export type MessageDirection = (typeof messageDirections)[number];

export const messageStatuses = ["received", "sent", "answered", "failed"] as const;
export type MessageStatus = (typeof messageStatuses)[number];

export type CustomerMessage = {
  id: string;
  discordMessageId?: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  direction: MessageDirection;
  status: MessageStatus;
  responseToMessageId?: string;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
};
