import { useEffect, useState } from "react";

import { type ApiEnvelope, apiGet, apiPatch } from "../../../shared/api/http";

type OrderItem = {
  productName: string;
  quantity: number;
  price: number;
};

type OrderInfo = {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
};

type CustomerInfo = {
  id: string;
  discordId?: string;
  name: string;
  email: string;
  phone?: string;
  leadStatus: "new" | "contacted" | "qualified" | "unqualified" | "converted";
  orders: OrderInfo[];
  createdAt: string;
};

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadCustomers() {
    try {
      const response = await apiGet<ApiEnvelope<CustomerInfo[]>>("/customers");
      setCustomers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleLeadStatusChange(customerId: string, newStatus: string) {
    setUpdatingId(customerId);
    try {
      await apiPatch(`/customers/${customerId}/lead-status`, { leadStatus: newStatus });
      // Update local state directly for responsive feel
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? { ...c, leadStatus: newStatus as CustomerInfo["leadStatus"] }
            : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update lead status");
    } finally {
      setUpdatingId(null);
    }
  }

  // Aggregate Metrics
  const totalCustomers = customers.length;
  const totalOrdersAmount = customers.reduce(
    (sum, c) => sum + c.orders.reduce((oSum, o) => oSum + o.totalAmount, 0),
    0
  );
  const totalOrdersCount = customers.reduce((sum, c) => sum + c.orders.length, 0);
  const newLeadsCount = customers.filter((c) => c.leadStatus === "new").length;
  const convertedLeadsCount = customers.filter((c) => c.leadStatus === "converted").length;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
      <header className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1>Customers & Leads</h1>
          <p>View registered customers, their order fulfillment histories, and track sales pipeline status.</p>
        </div>
      </header>

      {error && (
        <div className="error" style={{ marginBottom: 20, padding: 12, borderRadius: 8, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fee2e2" }}>
          {error}
        </div>
      )}

      {/* METRICS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Total Customers</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>{totalCustomers}</div>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Total Orders Value</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#16a34a" }}>${totalOrdersAmount.toFixed(2)} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>({totalOrdersCount} orders)</span></div>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>New Leads</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2563eb" }}>{newLeadsCount}</div>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Converted Leads</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8b5cf6" }}>{convertedLeadsCount}</div>
        </div>
      </div>

      {loading ? (
        <p className="muted" style={{ textAlign: "center", marginTop: 40 }}>Loading customers and leads database...</p>
      ) : customers.length === 0 ? (
        <div className="chat-empty-state" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 40, textAlign: "center" }}>
          <div className="chat-empty-state-icon" style={{ fontSize: "3rem", marginBottom: 12 }}>👥</div>
          <h2>No Customers Found</h2>
          <p className="muted" style={{ maxWidth: 420, margin: "0 auto 20px" }}>
            Create customer profiles using the AI Agent live simulator or wait for Discord users to register themselves.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {customers.map((customer) => (
            <div
              key={customer.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 16,
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: 16,
                  marginBottom: 16,
                }}
              >
                {/* Profile Details */}
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>{customer.name}</h3>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: "0.85rem", color: "#64748b" }}>
                    <span>📧 {customer.email}</span>
                    {customer.phone && <span>📞 {customer.phone}</span>}
                    {customer.discordId && (
                      <span style={{ background: "#e0e7ff", color: "#4338ca", padding: "1px 6px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 500 }}>
                        👾 Discord: {customer.discordId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lead Status Select */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label htmlFor={`lead-status-${customer.id}`} style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>Lead Status:</label>
                  <select
                    id={`lead-status-${customer.id}`}
                    value={customer.leadStatus}
                    onChange={(e) => handleLeadStatusChange(customer.id, e.target.value)}
                    disabled={updatingId === customer.id}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      background:
                        customer.leadStatus === "converted"
                          ? "#f3e8ff"
                          : customer.leadStatus === "qualified"
                          ? "#dcfce7"
                          : customer.leadStatus === "contacted"
                          ? "#dbeafe"
                          : customer.leadStatus === "unqualified"
                          ? "#fee2e2"
                          : "#f1f5f9",
                      color:
                        customer.leadStatus === "converted"
                          ? "#6b21a8"
                          : customer.leadStatus === "qualified"
                          ? "#166534"
                          : customer.leadStatus === "contacted"
                          ? "#1e40af"
                          : customer.leadStatus === "unqualified"
                          ? "#991b1b"
                          : "#475569",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="new">🆕 New</option>
                    <option value="contacted">📞 Contacted</option>
                    <option value="qualified">✔️ Qualified</option>
                    <option value="unqualified">❌ Unqualified</option>
                    <option value="converted">🎉 Converted</option>
                  </select>
                </div>
              </div>

              {/* ORDERS LIST CONTAINER */}
              <div>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem", fontWeight: 600, color: "#334155" }}>🛍️ Purchase History ({customer.orders.length})</h4>
                {customer.orders.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic" }}>No orders placed yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                    {customer.orders.map((order) => (
                      <div
                        key={order.id}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: 12,
                          fontSize: "0.85rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontWeight: 600 }}>
                          <span style={{ color: "#475569" }}>Order ID: {order.id.slice(-6).toUpperCase()}</span>
                          <span
                            style={{
                              background:
                                order.status === "delivered"
                                  ? "#dcfce7"
                                  : order.status === "cancelled"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                              color:
                                order.status === "delivered"
                                  ? "#15803d"
                                  : order.status === "cancelled"
                                  ? "#b91c1c"
                                  : "#b45309",
                              padding: "1px 6px",
                              borderRadius: 4,
                              fontSize: "0.75rem",
                            }}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#0f172a" }}>• {item.productName} (x{item.quantity})</span>
                              <span style={{ color: "#64748b" }}>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0f172a" }}>
                          <span>Total Amount:</span>
                          <span>${order.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
