const orderRows = [0, 1, 2];

export function CustomerOrdersLoader() {
  return (
    <div className="customer-order-list" role="status" aria-live="polite">
      <span className="sr-only">Loading customer orders</span>
      {orderRows.map((row) => (
        <article key={row} className="customer-order-card customer-order-card-loading" aria-hidden="true">
          <div className="order-card-main">
            <div>
              <span className="loading-skeleton loading-text medium" />
              <span className="loading-skeleton loading-text short" />
            </div>
            <span className="loading-skeleton loading-pill" />
          </div>

          <div className="order-card-meta">
            <span className="loading-skeleton loading-text tiny" />
            <span className="loading-skeleton loading-text" />
            <span className="loading-skeleton loading-text short" />
          </div>
        </article>
      ))}
    </div>
  );
}

