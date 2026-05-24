import { useCallback, useEffect, useState } from "react";
import { type ApiEnvelope, apiGet, apiPatch } from "../../../shared/api/http";

export type Command = {
  _id: string;
  name: string;
  description: string;
  parameters: any;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export function CommandsPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommandId, setExpandedCommandId] = useState<string | null>(null);

  const loadCommands = useCallback(async () => {
    setError(null);
    const response = await apiGet<ApiEnvelope<Command[]>>("/agent/commands");
    setCommands(response.data);
  }, []);

  useEffect(() => {
    loadCommands()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadCommands]);

  const handleToggleCommand = async (id: string, currentStatus: boolean) => {
    try {
      const response = await apiPatch<ApiEnvelope<Command>>(`/agent/commands/${id}`, {
        enabled: !currentStatus,
      });

      setCommands((prev) =>
        prev.map((cmd) => (cmd._id === id ? { ...cmd, enabled: response.data.enabled } : cmd))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to toggle command status");
    }
  };

  const renderParametersSchema = (parameters: any) => {
    if (!parameters || !parameters.properties) {
      return <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>No arguments required.</p>;
    }

    return (
      <div
        style={{
          marginTop: "12px",
          background: "#f8fafc",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#334155", marginBottom: "8px" }}>
          Arguments Schema
        </div>
        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.85rem", color: "#475569" }}>
          {Object.entries(parameters.properties).map(([name, schema]: [string, any]) => {
            const isRequired = parameters.required?.includes(name);
            return (
              <li key={name} style={{ marginBottom: "6px" }}>
                <code
                  style={{
                    background: "#cbd5e1",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    color: "#0f172a",
                    fontWeight: "600",
                    marginRight: "6px",
                  }}
                >
                  {name}
                </code>
                <span style={{ fontStyle: "italic", color: "#64748b", marginRight: "8px" }}>
                  ({schema.type})
                </span>
                {schema.description && <span>— {schema.description}</span>}
                {isRequired && (
                  <span style={{ color: "#ef4444", marginLeft: "6px", fontWeight: "700" }}>
                    *required
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <section className="commands-page">
      <style>{`
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
          border-radius: 34px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        input:checked + .slider {
          background-color: #5865f2;
        }
        input:checked + .slider:before {
          transform: translateX(24px);
        }
        .command-card {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .command-card:hover {
          border-color: #5865f2;
        }
      `}</style>

      <header className="page-header" style={{ marginBottom: "32px" }}>
        <div>
          <h1>Agent Commands</h1>
          <p>
            Dynamically adjust what the Discord support agent can do in real-time. Toggling command status
            immediately adds or removes capabilities from the LangChain tool list.
          </p>
        </div>
        <button className="button secondary" type="button" onClick={() => void loadCommands()}>
          Refresh
        </button>
      </header>

      {error ? (
        <div className="error" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="muted" style={{ textAlign: "center", padding: "40px" }}>
          Loading commands...
        </p>
      ) : (
        <div className="grid">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "20px" }}>
            {commands.map((cmd) => (
              <div key={cmd._id} className="card command-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div className="row" style={{ marginBottom: "12px", alignItems: "center" }}>
                    <code
                      style={{
                        background: "#e0e7ff",
                        color: "#4338ca",
                        padding: "4px 8px",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        fontSize: "0.95rem",
                        letterSpacing: "0.5px",
                      }}
                    >
                      /{cmd.name}
                    </code>

                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={cmd.enabled}
                        onChange={() => handleToggleCommand(cmd._id, cmd.enabled)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <p style={{ color: "#334155", fontSize: "0.95rem", margin: "0 0 16px 0", lineHeight: "1.5" }}>
                    {cmd.description}
                  </p>
                </div>

                <div style={{ marginTop: "auto", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="badge" style={{ background: cmd.enabled ? "#ecfdf5" : "#f1f5f9", color: cmd.enabled ? "#15803d" : "#64748b" }}>
                      {cmd.enabled ? "Active Tool" : "Disabled"}
                    </span>

                    <button
                      className="button secondary small"
                      type="button"
                      onClick={() =>
                        setExpandedCommandId(expandedCommandId === cmd._id ? null : cmd._id)
                      }
                    >
                      {expandedCommandId === cmd._id ? "Hide Schema" : "Show Schema"}
                    </button>
                  </div>

                  {expandedCommandId === cmd._id ? (
                    <div style={{ marginTop: "12px" }}>
                      {renderParametersSchema(cmd.parameters)}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: "12px", background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
            <h3 style={{ color: "#1e293b", margin: "0 0 10px 0" }}>💡 How the Dynamic Tool Registry Works</h3>
            <p className="muted" style={{ fontSize: "0.9rem", margin: 0, lineHeight: "1.6" }}>
              Our AI Discord Inbox is backed by a <strong>LangChain Agent Executor</strong> that reads this lookup table from MongoDB in real-time.
              When a command is toggled <strong>Active</strong>, it's immediately bound to the OpenAI model's environment.
              If the Discord user triggers that action (e.g. asking to see orders or register an account), the agent can execute the backend Mongoose routines automatically.
              Deactivating a command strips that capability from the model instantly, securing your system without re-deploying code.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
