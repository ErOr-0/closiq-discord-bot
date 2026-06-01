export enum ThreadStatus {
  Open = "open",
  Resolved = "resolved",
}

export enum SessionStatus {
  Active = "active",
  Completed = "completed",
}

export type CustomerMessage = {
  id: string;
  discordMessageId?: string;
  channelId: string;
  channelName?: string;
  authorId: string;
  authorName: string;
  content: string;
  direction: "inbound" | "outbound";
  status: "received" | "sent" | "answered" | "failed";
  responseToMessageId?: string;
  aiGenerated: boolean;
  threadId?: string;
  threadStatus?: ThreadStatus;
  sessionId?: string;
  sessionStatus?: SessionStatus;
  createdAt: string;
};

type MessageListProps = {
  messages: CustomerMessage[];
  onChannelSelect?: (channelId: string) => void;
  onContactSelect?: (authorId: string) => void;
};

export function MessageList({ messages, onChannelSelect, onContactSelect }: MessageListProps) {
  if (!messages.length) {
    return <p className="muted">No Discord messages yet. Once the bot receives messages, they will appear here.</p>;
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <article key={message.id} className={`message-card ${message.direction}`}>
          <div className="row">
            <strong
              onClick={() => {
                if (onContactSelect && message.direction === "inbound") {
                  onContactSelect(message.authorId);
                }
              }}
              style={{
                cursor: onContactSelect && message.direction === "inbound" ? "pointer" : "default",
                color: onContactSelect && message.direction === "inbound" ? "#4752c4" : "inherit",
              }}
              title={onContactSelect && message.direction === "inbound" ? "Filter by this contact" : undefined}
            >
              {message.authorName}
            </strong>
            <div className="row" style={{ gap: 6 }}>
              {message.channelId && (
                <span
                  className="badge channel-badge"
                  style={{
                    background: "#eff3ff",
                    color: "#4752c4",
                    cursor: onChannelSelect ? "pointer" : "default",
                  }}
                  onClick={() => onChannelSelect?.(message.channelId)}
                  title={onChannelSelect ? "Filter by this channel" : undefined}
                >
                  #{message.channelName || message.channelId}
                </span>
              )}
              <span className="badge">{message.direction}</span>
            </div>
          </div>
          <p>{message.content}</p>
          <div className="row muted" style={{ flexWrap: "wrap", gap: 10 }}>
            <div className="row" style={{ gap: 10 }}>
              <small>{new Date(message.createdAt).toLocaleString()}</small>
              <small>{message.aiGenerated ? "AI generated" : message.status}</small>
            </div>
            {(message.threadId || message.sessionId) && (
              <div className="row" style={{ gap: 6 }}>
                {message.threadId && (
                  <span
                    className="badge"
                    style={{ fontSize: "0.68rem", padding: "2px 6px", background: "#f3f4f6", color: "#4b5563" }}
                    title={`Thread ID: ${message.threadId}`}
                  >
                    Thread: {message.threadId.slice(-6)}
                    {message.threadStatus ? ` (${message.threadStatus})` : ""}
                  </span>
                )}
                {message.sessionId && (
                  <span
                    className="badge"
                    style={{ fontSize: "0.68rem", padding: "2px 6px", background: "#f3f4f6", color: "#4b5563" }}
                    title={`Session ID: ${message.sessionId}`}
                  >
                    Session: {message.sessionId.slice(-6)}
                    {message.sessionStatus ? ` (${message.sessionStatus})` : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
