import { FormEvent, useCallback, useEffect, useState, useRef } from "react";

import { type ApiEnvelope, apiGet, apiPost, apiPatch } from "../../../shared/api/http";
import { SessionStatus, ThreadStatus, type CustomerMessage } from "../components/MessageList";

type ManualInboundResponse = {
  inbound: CustomerMessage;
  outbound: CustomerMessage | null;
  suggestedAnswer: string;
  citations: Array<{ id: string; title: string; source?: string; score?: number }>;
};

type ResolveThreadResponse = {
  channelId?: string;
  channelIds: string[];
  threadStatus: ThreadStatus;
  resolvedThreadCount: number;
  completedSessionCount: number;
  alreadyResolved: boolean;
};

type Contact = {
  authorId: string;
  authorName: string;
};

type ChannelInfo = {
  id: string;
  name: string;
};

type ConversationThreadStatus = ThreadStatus;

export function MessagesPage() {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [testMessage, setTestMessage] = useState("");
  const [autoReply, setAutoReply] = useState(true); // Default to auto-reply for smoother chat simulation
  const [suggestedAnswer, setSuggestedAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Chat Form State
  const [newChannelId, setNewChannelId] = useState("");

  // Active Filters & Conversation States
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<string>("");

  const [availableChannels, setAvailableChannels] = useState<ChannelInfo[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setError(null);
    const response = await apiGet<ApiEnvelope<CustomerMessage[]>>("/messages?limit=150");
    setMessages(response.data);

    // Extract unique channels dynamically with name mapping if available
    const channelsMap = new Map<string, string>();
    response.data.forEach((msg) => {
      if (msg.channelId) {
        if (msg.channelName) {
          channelsMap.set(msg.channelId, msg.channelName);
        } else if (!channelsMap.has(msg.channelId)) {
          channelsMap.set(msg.channelId, msg.channelId);
        }
      }
    });
    const channels = Array.from(channelsMap.entries()).map(([id, name]) => ({ id, name }));
    setAvailableChannels(channels);

    // Extract unique contacts dynamically
    const contactsMap = new Map<string, Contact>();
    response.data.forEach((msg) => {
      if (msg.direction === "inbound" && msg.authorId) {
        contactsMap.set(msg.authorId, {
          authorId: msg.authorId,
          authorName: msg.authorName,
        });
      }
    });
    setAvailableContacts(Array.from(contactsMap.values()));
  }, []);

  // Poll for new messages
  useEffect(() => {
    loadMessages()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

    const timer = window.setInterval(() => {
      loadMessages().catch((err: Error) => setError(err.message));
    }, 10000);

    return () => window.clearInterval(timer);
  }, [loadMessages]);

  // Scroll to bottom when messages or selected channel change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChannel, selectedContact]);

  // Handle simulated message submission (Inbound customer message)
  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();

    if (!testMessage.trim()) {
      return;
    }

    if (isCurrentConversationResolved) {
      setError("Resolved conversations are read-only.");
      return;
    }

    // Determine the channel to send to:
    // If a channel is active, use it. If a contact is active, use their channel. Otherwise, default.
    let activeChannel = selectedChannel;
    let authorId = "manual-user";
    let authorName = "Manual Tester";

    if (selectedContact) {
      const contactMsg = messages.find((m) => m.authorId === selectedContact);
      activeChannel = contactMsg?.channelId || "manual-test-channel";
      authorId = selectedContact;
      authorName = contactMsg?.authorName || "Customer";
    }

    if (!activeChannel) {
      activeChannel = "manual-test-channel";
    }

    setSubmitting(true);
    setError(null);
    setSuggestedAnswer(null);

    try {
      const response = await apiPost<ApiEnvelope<ManualInboundResponse>>("/messages/inbound", {
        channelId: activeChannel,
        authorId,
        authorName,
        content: testMessage,
        autoReply,
      });

      setSuggestedAnswer(response.data.suggestedAnswer);
      setTestMessage("");
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Thread Resolution
  async function handleResolveThread() {
    let activeChannel = selectedChannel;
    const openThreadIds = Array.from(
      new Set(
        activeChatMessages
          .filter((message) => message.threadStatus === ThreadStatus.Open && message.threadId)
          .map((message) => message.threadId as string)
      )
    );

    if (selectedContact) {
      const contactMsg = messages.find((m) => m.authorId === selectedContact);
      activeChannel = contactMsg?.channelId || "";
    }

    if (!activeChannel && openThreadIds.length === 0) return;

    setResolving(true);
    setError(null);
    try {
      const response = await apiPatch<ApiEnvelope<ResolveThreadResponse>>("/messages/threads/resolve", {
        channelId: activeChannel || undefined,
        threadIds: openThreadIds.length > 0 ? openThreadIds : undefined,
      });
      setSuggestedAnswer(null);
      markResolvedConversation(response.data, activeChannel, openThreadIds);
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resolve thread");
    } finally {
      setResolving(false);
    }
  }

  function markResolvedConversation(
    result: ResolveThreadResponse,
    activeChannel: string,
    openThreadIds: string[]
  ) {
    const resolvedChannelIds = new Set([
      ...result.channelIds,
      ...(result.channelId ? [result.channelId] : []),
      ...(activeChannel ? [activeChannel] : []),
    ]);
    const resolvedThreadIds = new Set(openThreadIds);

    setMessages((currentMessages) =>
      currentMessages.map((message) => {
        const matchesResolvedThread =
          message.threadId && resolvedThreadIds.has(message.threadId);
        const matchesResolvedChannel =
          resolvedThreadIds.size === 0 && resolvedChannelIds.has(message.channelId);

        if (!matchesResolvedThread && !matchesResolvedChannel) {
          return message;
        }

        return {
          ...message,
          threadStatus: ThreadStatus.Resolved,
          sessionStatus: SessionStatus.Completed,
        };
      })
    );
  }

  // Handle adding/testing a completely new channel conversation
  function handleCreateNewChat(event: FormEvent) {
    event.preventDefault();
    const cleanId = newChannelId.trim();
    if (!cleanId) return;

    if (!availableChannels.some((c) => c.id === cleanId)) {
      setAvailableChannels((prev) => [{ id: cleanId, name: cleanId }, ...prev]);
    }
    setSelectedChannel(cleanId);
    setSelectedContact("");
    setNewChannelId("");
  }

  // Calculate active chat history for the active conversation
  const contactInboundIds = new Set(
    messages
      .filter((msg) => msg.direction === "inbound" && msg.authorId === selectedContact)
      .map((msg) => msg.id)
  );

  const contactChannelIds = new Set(
    messages
      .filter((msg) => msg.direction === "inbound" && msg.authorId === selectedContact)
      .map((msg) => msg.channelId)
  );

  // Filter messages for the current view
  // In a conversational view, we sort oldest-first (Ascending) so new messages appear at the bottom!
  const activeChatMessages = messages
    .filter((msg) => {
      if (selectedChannel) {
        return msg.channelId === selectedChannel;
      }
      if (selectedContact) {
        if (msg.direction === "inbound") {
          return msg.authorId === selectedContact;
        } else {
          return (
            contactChannelIds.has(msg.channelId) ||
            (msg.responseToMessageId && contactInboundIds.has(msg.responseToMessageId))
          );
        }
      }
      return false;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const currentConversationStatus = getConversationThreadStatus(activeChatMessages);
  const isCurrentConversationResolved = currentConversationStatus === ThreadStatus.Resolved;

  const currentChatLabel = selectedChannel
    ? `#${availableChannels.find((c) => c.id === selectedChannel)?.name || selectedChannel}`
    : selectedContact
    ? availableContacts.find((c) => c.authorId === selectedContact)?.authorName || selectedContact
    : null;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto" }}>
      <header className="page-header">
        <div>
          <h1>Chat Center</h1>
          <p>Interact with Discord customers and AI agents in real-time conversation simulator.</p>
        </div>
      </header>

      {error ? <div className="error" style={{ marginBottom: 20 }}>{error}</div> : null}

      <div className="chat-container">
        {/* SIDEBAR: List of conversations */}
        <div className="chat-sidebar">
          {/* Create new simulation channel */}
          <form onSubmit={handleCreateNewChat} className="chat-sidebar-header">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="chat-sidebar-search"
                type="text"
                placeholder="+ New simulated channel..."
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
              />
              <button className="button" type="submit" style={{ padding: "8px 12px", borderRadius: 10, fontSize: "0.85rem" }}>
                Add
              </button>
            </div>
          </form>

          <div className="chat-list">
            {/* CHANNELS SECTION */}
            <div className="chat-list-category">Discord Channels</div>
            {availableChannels.length === 0 ? (
              <p className="muted" style={{ padding: "10px 16px", fontSize: "0.8rem" }}>No active channels</p>
            ) : (
              availableChannels.map((chan) => {
                const isActive = selectedChannel === chan.id;
                const channelMessages = messages.filter((m) => m.channelId === chan.id);
                const lastMsg = channelMessages[0];
                const threadStatus = getConversationThreadStatus(channelMessages);
                return (
                  <div
                    key={chan.id}
                    className={`chat-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setSelectedChannel(chan.id);
                      setSelectedContact("");
                    }}
                  >
                    <div className="chat-item-avatar">#</div>
                    <div className="chat-item-info">
                      <div className="chat-item-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>#{chan.name}</span>
                        {threadStatus ? <ThreadStatusBadge status={threadStatus} /> : null}
                      </div>
                      <div className="chat-item-subtitle">{lastMsg ? lastMsg.content : "No messages"}</div>
                    </div>
                  </div>
                );
              })
            )}

            {/* CONTACTS SECTION */}
            <div className="chat-list-category">Customer Contacts</div>
            {availableContacts.length === 0 ? (
              <p className="muted" style={{ padding: "10px 16px", fontSize: "0.8rem" }}>No customer contacts</p>
            ) : (
              availableContacts.map((contact) => {
                const isActive = selectedContact === contact.authorId;
                const contactMessages = messages.filter((m) => m.authorId === contact.authorId);
                const lastMsg = contactMessages[0];
                const threadStatus = getConversationThreadStatus(contactMessages);
                const initials = contact.authorName ? contact.authorName.substring(0, 2).toUpperCase() : "U";
                return (
                  <div
                    key={contact.authorId}
                    className={`chat-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setSelectedContact(contact.authorId);
                      setSelectedChannel("");
                    }}
                  >
                    <div className="chat-item-avatar">{initials}</div>
                    <div className="chat-item-info">
                      <div className="chat-item-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{contact.authorName}</span>
                        {threadStatus ? <ThreadStatusBadge status={threadStatus} /> : null}
                      </div>
                      <div className="chat-item-subtitle">{lastMsg ? lastMsg.content : "No messages"}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MAIN CHAT WINDOW */}
        <div className="chat-feed-container">
          {currentChatLabel ? (
            <>
              {/* CHAT HEADER */}
              <div className="chat-feed-header">
                <div className="chat-feed-header-info">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3>{currentChatLabel}</h3>
                    {currentConversationStatus ? <ThreadStatusBadge status={currentConversationStatus} /> : null}
                  </div>
                  <p className="muted">
                    {selectedChannel ? `Simulated Discord support ticket channel` : `Customer Direct Conversation`}
                  </p>
                </div>
                <div>
                  <button
                    className="button secondary small"
                    type="button"
                    onClick={handleResolveThread}
                    disabled={resolving || isCurrentConversationResolved}
                    style={{
                      background: isCurrentConversationResolved ? "#f1f5f9" : "#fef2f2",
                      color: isCurrentConversationResolved ? "#475569" : "#991b1b",
                      border: isCurrentConversationResolved ? "1px solid #e2e8f0" : "1px solid #fee2e2",
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    {resolving ? "Resolving..." : isCurrentConversationResolved ? "Resolved" : "Resolve Thread"}
                  </button>
                </div>
              </div>

              {/* CHAT SCROLL FEED */}
              <div className="chat-feed-scroll">
                {loading ? (
                  <p className="muted" style={{ textAlign: "center", marginTop: 40 }}>Loading chat history...</p>
                ) : activeChatMessages.length === 0 ? (
                  <div className="chat-empty-state" style={{ background: "transparent" }}>
                    <p>No messages in this conversation yet.</p>
                    <p className="muted" style={{ fontSize: "0.8rem" }}>Simulate the first customer message using the input bar below!</p>
                  </div>
                ) : (
                  activeChatMessages.map((message) => {
                    const isInbound = message.direction === "inbound";
                    return (
                      <div key={message.id} className={`chat-bubble-wrapper ${message.direction}`}>
                        <div className="chat-bubble">
                          <div className="chat-bubble-author" style={{ fontSize: "0.78rem", marginBottom: 3 }}>
                            {message.authorName}
                          </div>
                          <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.4" }}>{message.content}</p>
                          <div className="chat-bubble-meta">
                            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span style={{ textTransform: "capitalize" }}>
                              {message.aiGenerated ? "AI Agent" : message.status}
                            </span>
                            {message.threadId && (
                              <>
                                <span>•</span>
                                <span title={`Thread ID: ${message.threadId}`}>
                                  Thread: {message.threadId.slice(-4)}
                                  {message.threadStatus ? ` (${message.threadStatus})` : ""}
                                </span>
                              </>
                            )}
                            {message.sessionId && (
                              <>
                                <span>•</span>
                                <span title={`Session ID: ${message.sessionId}`}>
                                  Session: {message.sessionId.slice(-4)}
                                  {message.sessionStatus ? ` (${message.sessionStatus})` : ""}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* CHAT INPUT BAR */}
              <div className="chat-input-bar">
                {isCurrentConversationResolved ? (
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      justifyContent: "center",
                      minHeight: 40,
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#b91c1c",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                      }}
                    >
                      This conversation is resolved.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="chat-input-fields">
                    <input
                      className="chat-input-text"
                      type="text"
                      placeholder={`Message as ${selectedContact ? "customer" : "customer in " + currentChatLabel}...`}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      disabled={submitting}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>
                      <input
                        type="checkbox"
                        checked={autoReply}
                        onChange={(e) => setAutoReply(e.target.checked)}
                        disabled={submitting}
                      />
                      AI Auto-Reply
                    </label>
                    <button className="button" type="submit" disabled={submitting || !testMessage.trim()} style={{ borderRadius: 20, padding: "10px 20px" }}>
                      {submitting ? "..." : "Send"}
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            /* EMPTY CHAT WINDOW (NO SELECTION) */
            <div className="chat-empty-state">
              <div className="chat-empty-state-icon">💬</div>
              <h2>Select a Conversation</h2>
              <p className="muted" style={{ maxWidth: 380, margin: "0 auto" }}>
                Choose an active Discord Channel or Customer Contact from the left sidebar to start simulated support chats and test the AI Agent.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function getConversationThreadStatus(messages: CustomerMessage[]): ConversationThreadStatus | undefined {
  if (messages.some((message) => message.threadStatus === ThreadStatus.Open)) {
    return ThreadStatus.Open;
  }

  if (messages.some((message) => message.threadStatus === ThreadStatus.Resolved)) {
    return ThreadStatus.Resolved;
  }

  return undefined;
}

function ThreadStatusBadge({ status }: { status: ConversationThreadStatus }) {
  const isResolved = status === ThreadStatus.Resolved;

  return (
    <span
      className="badge"
      style={{
        flexShrink: 0,
        padding: "2px 7px",
        fontSize: "0.66rem",
        background: isResolved ? "#f1f5f9" : "#ecfdf5",
        color: isResolved ? "#475569" : "#15803d",
        border: isResolved ? "1px solid #e2e8f0" : "1px solid #bbf7d0",
      }}
    >
      {status}
    </span>
  );
}
