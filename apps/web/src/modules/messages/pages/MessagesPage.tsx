import { FormEvent, useCallback, useEffect, useState } from "react";

import { type ApiEnvelope, apiGet, apiPost } from "../../../shared/api/http";
import { MessageList, type CustomerMessage } from "../components/MessageList";

type ManualInboundResponse = {
  inbound: CustomerMessage;
  outbound: CustomerMessage | null;
  suggestedAnswer: string;
  citations: Array<{ id: string; title: string; source?: string; score?: number }>;
};

export function MessagesPage() {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [testMessage, setTestMessage] = useState("");
  const [autoReply, setAutoReply] = useState(false);
  const [suggestedAnswer, setSuggestedAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setError(null);
    const response = await apiGet<ApiEnvelope<CustomerMessage[]>>("/messages?limit=100");
    setMessages(response.data);
  }, []);

  useEffect(() => {
    loadMessages()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

    const timer = window.setInterval(() => {
      loadMessages().catch((err: Error) => setError(err.message));
    }, 10000);

    return () => window.clearInterval(timer);
  }, [loadMessages]);

  async function handleManualMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!testMessage.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuggestedAnswer(null);

    try {
      const response = await apiPost<ApiEnvelope<ManualInboundResponse>>("/messages/inbound", {
        content: testMessage,
        autoReply,
      });

      setSuggestedAnswer(response.data.suggestedAnswer);
      setTestMessage("");
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit message");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Messages</h1>
          <p>View Discord customer messages and AI-generated replies in one inbox.</p>
        </div>
        <button className="button secondary" type="button" onClick={() => void loadMessages()}>
          Refresh
        </button>
      </header>

      <div className="grid two-column">
        <form className="card" onSubmit={handleManualMessage}>
          <h2>Test inbound message</h2>
          <p className="muted">Use this while your Discord bot token or channel is not configured yet.</p>

          <div className="field">
            <label htmlFor="testMessage">Customer message</label>
            <textarea
              id="testMessage"
              placeholder="Example: How can I reset my subscription billing email?"
              value={testMessage}
              onChange={(event) => setTestMessage(event.target.value)}
            />
          </div>

          <label className="row" style={{ justifyContent: "flex-start" }}>
            <input
              checked={autoReply}
              type="checkbox"
              onChange={(event) => setAutoReply(event.target.checked)}
            />
            Store suggested answer as an outbound message
          </label>

          <button className="button" disabled={submitting} type="submit">
            {submitting ? "Sending..." : "Send test message"}
          </button>

          {suggestedAnswer ? <div className="success">Suggested answer: {suggestedAnswer}</div> : null}
        </form>

        <div className="card">
          <div className="row" style={{ marginBottom: 18 }}>
            <h2>Discord inbox</h2>
            <span className="badge">{messages.length} messages</span>
          </div>

          {error ? <div className="error">{error}</div> : null}
          {loading ? <p className="muted">Loading messages...</p> : <MessageList messages={messages} />}
        </div>
      </div>
    </section>
  );
}
