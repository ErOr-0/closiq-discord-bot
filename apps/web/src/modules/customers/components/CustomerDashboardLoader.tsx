const overviewBars = ["78%", "56%", "42%"];
const panelRows = [0, 1, 2];

export function CustomerDashboardLoader() {
  return (
    <div className="customer-dashboard-loader" role="status" aria-live="polite">
      <span className="sr-only">Loading customer dashboard</span>

      <section className="customer-overview" aria-hidden="true">
        <article className="overview-card customer-count-card loading-overview-card">
          <span className="overview-label">Loading</span>
          <span className="loading-skeleton loading-value" />
          <span className="loading-skeleton loading-text short" />
        </article>

        <article className="overview-card sales-overview-card loading-overview-card">
          <div className="sales-overview-header">
            <div>
              <span className="overview-label">Total earning</span>
              <span className="loading-skeleton loading-value wide" />
            </div>
            <div className="sales-overview-meta">
              <span className="loading-skeleton loading-text tiny" />
              <strong className="loading-skeleton loading-text" />
            </div>
          </div>

          <div className="sales-chart">
            {overviewBars.map((width) => (
              <div key={width} className="sales-chart-row">
                <span className="loading-skeleton loading-text" />
                <div className="sales-chart-track">
                  <div className="sales-chart-bar loading-chart-bar" style={{ width }} />
                </div>
                <strong className="loading-skeleton loading-text tiny" />
              </div>
            ))}
          </div>
        </article>
      </section>

      <div className="manager-panel customer-dashboard-loading-panel">
        <div className="dashboard-loading-copy">
          <div className="dashboard-loading-spinner" aria-hidden="true" />
          <div>
            <strong>Preparing dashboard data</strong>
            <p>Loading customers, orders, and earning totals.</p>
          </div>
        </div>

        <div className="dashboard-loading-grid" aria-hidden="true">
          {panelRows.map((row) => (
            <div key={row} className="dashboard-loading-block">
              <span className="loading-skeleton loading-text short" />
              <span className="loading-skeleton loading-text" />
              <span className="loading-skeleton loading-text medium" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

