import { FormEvent, useCallback, useEffect, useState, useRef } from "react";

import { type ApiEnvelope, apiGet, apiPost, apiPatch } from "../../../shared/api/http";
import { MessageList, type CustomerMessage } from "../components/MessageList";

type ManualInboundResponse = {
  inbound: CustomerMessage;
  outbound: CustomerMessage | null;
  suggestedAnswer: string;
  citations: Array<{ id: string; title: string; source?: string; score?: number }>;
};

type Contact = {
  authorId: string;
  authorName: string;
};

type ChannelInfo = {
  id: string;
  name: string;
};

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
      if (threadAutoReply === false) {
        // Since we are delegated to human support, send this as an OUTBOUND human agent reply
        await apiPost("/messages/outbound", {
          channelId: activeChannel,
          content: testMessage,
          authorId: "human-agent",
          authorName: "Human Support Agent",
        });
      } else {
        // Customer simulation (Inbound)
        const response = await apiPost<ApiEnvelope<ManualInboundResponse>>("/messages/inbound", {
          channelId: activeChannel,
          authorId,
          authorName,
          content: testMessage,
          autoReply,
        });

        setSuggestedAnswer(response.data.suggestedAnswer);
      }

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
    if (selectedContact) {
      const contactMsg = messages.find((m) => m.authorId === selectedContact);
      activeChannel = contactMsg?.channelId || "";
    }

    if (!activeChannel) return;

    setResolving(true);
    setError(null);
    try {
      await apiPatch("/messages/threads/resolve", { channelId: activeChannel });
      setSelectedChannel("");
      setSelectedContact("");
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resolve thread");
    } finally {
      setResolving(false);
    }
  }

  // Active channel helper for fetching/updating thread-specific auto-reply settings
  const activeChannelId = (() => {
    if (selectedChannel) return selectedChannel;
    if (selectedContact) {
      const contactMsg = messages.find((m) => m.authorId === selectedContact);
      return contactMsg?.channelId || "";
    }
    return "";
  })();

  type ThreadInfo = {
    _id: string;
    channelId: string;
    authorId: string;
    status: "open" | "resolved";
    autoReply: boolean;
    createdAt: string;
    updatedAt: string;
  };

  const [channelThreads, setChannelThreads] = useState<ThreadInfo[]>([]);
  const [threadAutoReply, setThreadAutoReply] = useState<boolean | null>(null);
  const [togglingAutoReply, setTogglingAutoReply] = useState(false);

  // Sync thread status and list of threads
  useEffect(() => {
    if (!activeChannelId) {
      setChannelThreads([]);
      setThreadAutoReply(null);
      return;
    }

    let isMounted = true;
    apiGet<{ data: ThreadInfo[] }>(`/messages/threads?channelId=${activeChannelId}`)
      .then((res) => {
        if (isMounted) {
          setChannelThreads(res.data);
          // Find the active open thread to configure the top toggle button
          const activeThread = res.data.find((t) => t.status === "open");
          if (activeThread) {
            setThreadAutoReply(activeThread.autoReply);
          } else {
            setThreadAutoReply(null);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load threads:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeChannelId, messages]);

  async function handleToggleThreadAutoReply() {
    if (!activeChannelId || threadAutoReply === null) return;

    setTogglingAutoReply(true);
    setError(null);
    try {
      const newSetting = !threadAutoReply;
      const response = await apiPatch<{ data: { autoReply: boolean } }>("/messages/threads/auto-reply", {
        channelId: activeChannelId,
        autoReply: newSetting,
      });
      setThreadAutoReply(response.data.autoReply);
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to toggle AI Auto-Reply setting");
    } finally {
      setTogglingAutoReply(false);
    }
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

  interface ThreadGroup {
    threadId: string;
    messages: CustomerMessage[];
    firstMessageCreatedAt: string;
  }

  const threadGroups: ThreadGroup[] = [];
  const threadMap = new Map<string, ThreadGroup>();

  activeChatMessages.forEach((msg) => {
    const threadId = msg.threadId || "legacy-thread";
    if (!threadMap.has(threadId)) {
      const newGroup: ThreadGroup = {
        threadId,
        messages: [],
        firstMessageCreatedAt: msg.createdAt,
      };
      threadGroups.push(newGroup);
      threadMap.set(threadId, newGroup);
    }
    threadMap.get(threadId)!.messages.push(msg);
  });

  // Check if current thread has messages and what the status of the thread is
  const isCurrentConversationResolved = (() => {
    // Check if the latest message has threadId, then we can search our array or default to open
    // Since we resolve via channelId, let's look for any open thread for this channel
    return false; // UI will let you click resolve thread anytime
  })();

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
                const lastMsg = messages.filter((m) => m.channelId === chan.id).slice(-1)[0];
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
                      <div className="chat-item-name">#{chan.name}</div>
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
                const lastMsg = messages.filter((m) => m.authorId === contact.authorId).slice(-1)[0];
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
                      <div className="chat-item-name">{contact.authorName}</div>
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
                  <h3>{currentChatLabel}</h3>
                  <p className="muted">
                    {selectedChannel ? `Simulated Discord support ticket channel` : `Customer Direct Conversation`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {threadAutoReply !== null && (
                    <button
                      className="button secondary small"
                      type="button"
                      onClick={handleToggleThreadAutoReply}
                      disabled={togglingAutoReply}
                      style={{
                        background: threadAutoReply ? "#edfcf2" : "#fffbeb",
                        color: threadAutoReply ? "#15803d" : "#b45309",
                        border: threadAutoReply ? "1px solid #bbf7d0" : "1px solid #fef3c7",
                        borderRadius: 8,
                        fontWeight: 600,
                        padding: "8px 12px",
                      }}
                    >
                      {togglingAutoReply
                        ? "Saving..."
                        : threadAutoReply
                        ? "🤖 AI Auto-Reply: ON (Click to Delegate to Human)"
                        : "🙋‍♂️ Delegated to Human Support (Click to Enable AI)"}
                    </button>
                  )}
                  <button
                    className="button secondary small"
                    type="button"
                    onClick={handleResolveThread}
                    disabled={resolving}
                    style={{
                      background: "#fef2f2",
                      color: "#991b1b",
                      border: "1px solid #fee2e2",
                      borderRadius: 8,
                      fontWeight: 600,
                      padding: "8px 12px",
                    }}
                  >
                    {resolving ? "Resolving..." : "Resolve Thread"}
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
                  threadGroups.map((group) => {
                    const threadInfo = channelThreads.find((t) => t._id === group.threadId);
                    const status = threadInfo?.status || "resolved";
                    const isAutoReply = threadInfo ? threadInfo.autoReply : true;

                    return (
                      <div
                        key={group.threadId}
                        style={{
                          background: status === "open" ? "#ffffff" : "#f8fafc",
                          border: status === "open" ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 20,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                      >
                        {/* Thread Card Header */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px solid #e2e8f0",
                            paddingBottom: 8,
                            marginBottom: 12,
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ color: "#64748b" }}>
                            🎟️ Thread ID: <code style={{ fontSize: "0.85rem", background: "#f1f5f9", padding: "2px 4px", borderRadius: 4 }}>{group.threadId.slice(-6)}</code>
                          </span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span
                              style={{
                                background: status === "open" ? "#dbeafe" : "#f1f5f9",
                                color: status === "open" ? "#1e40af" : "#475569",
                                padding: "3px 8px",
                                borderRadius: 12,
                                fontSize: "0.7rem",
                                textTransform: "uppercase",
                              }}
                            >
                              {status === "open" ? "🟢 Active / Open" : "🔴 Resolved / Closed"}
                            </span>
                            {status === "open" && (
                              <span
                                style={{
                                  background: isAutoReply ? "#dcfce7" : "#fef3c7",
                                  color: isAutoReply ? "#166534" : "#92400e",
                                  padding: "3px 8px",
                                  borderRadius: 12,
                                  fontSize: "0.7rem",
                                }}
                              >
                                {isAutoReply ? "🤖 AI Auto-Reply" : "🙋‍♂️ Human Support"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Thread Card Messages */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {group.messages.map((message) => {
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
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* CHAT INPUT BAR */}
              <div className="chat-input-bar">
                <form onSubmit={handleSendMessage} className="chat-input-fields">
                  <input
                    className="chat-input-text"
                    type="text"
                    placeholder={
                      threadAutoReply === false
                        ? "Reply to customer as Support Agent..."
                        : `Message as ${selectedContact ? "customer" : "customer in " + currentChatLabel}...`
                    }
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    disabled={submitting}
                  />
                  {threadAutoReply === false ? (
                    <span style={{ fontSize: "0.75rem", color: "#b45309", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                      🙋‍♂️ Human Active
                    </span>
                  ) : (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>
                      <input
                        type="checkbox"
                        checked={autoReply}
                        onChange={(e) => setAutoReply(e.target.checked)}
                      />
                      AI Auto-Reply
                    </label>
                  )}
                  <button className="button" type="submit" disabled={submitting || !testMessage.trim()} style={{ borderRadius: 20, padding: "10px 20px" }}>
                    {submitting ? "..." : "Send"}
                  </button>
                </form>
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
