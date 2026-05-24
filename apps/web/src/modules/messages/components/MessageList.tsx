export type CustomerMessage = {
  id: string;
  discordMessageId?: string;
  channelId: string;
  authorName: string;
  content: string;
  direction: "inbound" | "outbound";
  status: "received" | "sent" | "answered" | "failed";
  aiGenerated: boolean;
  createdAt: string;
};

type MessageListProps = {
  messages: CustomerMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  if (!messages.length) {
    return <p className="muted">No Discord messages yet. Once the bot receives messages, they will appear here.</p>;
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <article key={message.id} className={`message-card ${message.direction}`}>
          <div className="row">
            <strong>{message.authorName}</strong>
            <span className="badge">{message.direction}</span>
          </div>
          <p>{message.content}</p>
          <div className="row muted">
            <small>{new Date(message.createdAt).toLocaleString()}</small>
            <small>{message.aiGenerated ? "AI generated" : message.status}</small>
          </div>
        </article>
      ))}
    </div>
  );
}
