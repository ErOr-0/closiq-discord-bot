import { useEffect, useState } from "react";

import { type ApiEnvelope, apiGet } from "../../../shared/api/http";

type SalesStats = {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
};

type LeadsStats = {
  new: number;
  contacted: number;
  qualified: number;
  unqualified: number;
  converted: number;
};

type RecentOrderInfo = {
  id: string;
  customerName: string;
  customerEmail: string;
  itemsCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
};

type ActiveThreadInfo = {
  id: string;
  channelId: string;
  authorId: string;
  autoReply: boolean;
  createdAt: string;
};

type DashboardStats = {
  totalCustomers: number;
  sales: SalesStats;
  leads: LeadsStats;
  recentOrders: RecentOrderInfo[];
  activeThreads: ActiveThreadInfo[];
};

type DashboardPageProps = {
  onNavigateToTab: (tab: "messages" | "customers") => void;
};

export function DashboardPage({ onNavigateToTab }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ApiEnvelope<DashboardStats>>("/dashboard/stats")
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load dashboard stats");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="muted" style={{ textAlign: "center", marginTop: 60 }}>Loading dedicated operational dashboard...</p>;
  }

  if (error || !stats) {
    return (
      <div className="error" style={{ margin: "40px auto", maxWidth: 600, padding: 16, borderRadius: 8, background: "#fef2f2", color: "#b91c1c" }}>
        {error || "Failed to load statistics."}
      </div>
    );
  }

  const { totalCustomers, sales, leads, recentOrders, activeThreads } = stats;

  // Calculate percentages for Lead pipeline funnel
  const totalLeads = leads.new + leads.contacted + leads.qualified + leads.unqualified + leads.converted;
  const getPercent = (val: number) => (totalLeads > 0 ? (val / totalLeads) * 100 : 0);

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
      <header className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1>Operations Dashboard</h1>
          <p>Real-time analytics across your Discord customer profiles, sales pipeline, and active helpdesk threads.</p>
        </div>
      </header>

      {/* KPI METRIC GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 28 }}>
        {/* Metric 1 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: "2.25rem", padding: 10, background: "#f1f5f9", borderRadius: 10, lineHeight: 1 }}>👥</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Customers</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{totalCustomers}</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: "2.25rem", padding: 10, background: "#ecfdf5", borderRadius: 10, lineHeight: 1 }}>💰</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Sales Revenue</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#16a34a", marginTop: 2 }}>${sales.totalSales.toFixed(2)}</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: "2.25rem", padding: 10, background: "#eff6ff", borderRadius: 10, lineHeight: 1 }}>📦</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Orders Placed</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2563eb", marginTop: 2 }}>{sales.totalOrders}</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: "2.25rem", padding: 10, background: "#faf5ff", borderRadius: 10, lineHeight: 1 }}>📈</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Avg Order Value</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8b5cf6", marginTop: 2 }}>${sales.averageOrderValue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* LEAD STATUS FUNNEL / PIPELINE */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, marginBottom: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>🎯 Lead Conversion Pipeline</h3>
          <button onClick={() => onNavigateToTab("customers")} style={{ fontSize: "0.8rem", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            Manage Leads &gt;
          </button>
        </div>

        {/* Proportional Progress Funnel */}
        <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", background: "#f1f5f9", marginBottom: 20 }}>
          {leads.new > 0 && <div title={`New: ${leads.new}`} style={{ width: `${getPercent(leads.new)}%`, background: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.75rem", fontWeight: 700 }}>{leads.new}</div>}
          {leads.contacted > 0 && <div title={`Contacted: ${leads.contacted}`} style={{ width: `${getPercent(leads.contacted)}%`, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.75rem", fontWeight: 700 }}>{leads.contacted}</div>}
          {leads.qualified > 0 && <div title={`Qualified: ${leads.qualified}`} style={{ width: `${getPercent(leads.qualified)}%`, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.75rem", fontWeight: 700 }}>{leads.qualified}</div>}
          {leads.converted > 0 && <div title={`Converted: ${leads.converted}`} style={{ width: `${getPercent(leads.converted)}%`, background: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.75rem", fontWeight: 700 }}>{leads.converted}</div>}
          {leads.unqualified > 0 && <div title={`Unqualified: ${leads.unqualified}`} style={{ width: `${getPercent(leads.unqualified)}%`, background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.75rem", fontWeight: 700 }}>{leads.unqualified}</div>}
        </div>

        {/* Funnel Labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16 }}>
          <div style={{ borderLeft: "3px solid #94a3b8", paddingLeft: 10 }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>🆕 New Leads</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{leads.new} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>({getPercent(leads.new).toFixed(0)}%)</span></div>
          </div>
          <div style={{ borderLeft: "3px solid #3b82f6", paddingLeft: 10 }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>📞 Contacted</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{leads.contacted} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>({getPercent(leads.contacted).toFixed(0)}%)</span></div>
          </div>
          <div style={{ borderLeft: "3px solid #10b981", paddingLeft: 10 }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>✔️ Qualified</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{leads.qualified} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>({getPercent(leads.qualified).toFixed(0)}%)</span></div>
          </div>
          <div style={{ borderLeft: "3px solid #8b5cf6", paddingLeft: 10 }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>🎉 Converted</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{leads.converted} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>({getPercent(leads.converted).toFixed(0)}%)</span></div>
          </div>
          <div style={{ borderLeft: "3px solid #ef4444", paddingLeft: 10 }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>❌ Unqualified</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{leads.unqualified} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>({getPercent(leads.unqualified).toFixed(0)}%)</span></div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN SUMMARY LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 28, marginBottom: 40 }}>
        {/* Column 1: Recent Orders */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>🛍️ Recent Customer Orders</h3>
            <button onClick={() => onNavigateToTab("customers")} style={{ fontSize: "0.8rem", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              All Customers &gt;
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>No orders placed yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "8px 0", fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: "8px 0", fontWeight: 600 }}>Items</th>
                    <th style={{ padding: "8px 0", fontWeight: 600, textAlign: "right" }}>Total</th>
                    <th style={{ padding: "8px 0, 8px 12px", fontWeight: 600, textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 0" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{order.customerName}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{order.customerEmail}</div>
                      </td>
                      <td style={{ padding: "12px 0", color: "#475569" }}>{order.itemsCount} items</td>
                      <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>${order.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: "12px 0", textAlign: "right" }}>
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
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: "0.75rem",
                            fontWeight: 500,
                          }}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Column 2: Active Discord Chats / Support Threads */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>💬 Active Support Threads ({activeThreads.length})</h3>
            <button onClick={() => onNavigateToTab("messages")} style={{ fontSize: "0.8rem", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Chat Center &gt;
            </button>
          </div>

          {activeThreads.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic" }}>No active helpdesk tickets open.</p>
              <button className="button small secondary" onClick={() => onNavigateToTab("messages")} style={{ padding: "6px 12px", borderRadius: 6, fontSize: "0.8rem" }}>
                Simulate a Ticket
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeThreads.map((thread) => (
                <div
                  key={thread.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>Channel: #{thread.channelId.substring(0, 14)}...</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                      Created: {new Date(thread.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        background: thread.autoReply ? "#dcfce7" : "#fffbeb",
                        color: thread.autoReply ? "#15803d" : "#b45309",
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {thread.autoReply ? "🤖 AI Auto-Reply" : "🙋‍♂️ Human"}
                    </span>
                    <button
                      className="button small"
                      onClick={() => onNavigateToTab("messages")}
                      style={{ padding: "6px 10px", borderRadius: 6, fontSize: "0.75rem" }}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
