import type { Customer } from "../types";

type CustomerOverviewProps = {
  customers: Customer[];
};

export function CustomerOverview({ customers }: CustomerOverviewProps) {
  const totalEarning = customers.reduce((total, customer) => total + customer.totalEarning, 0);
  const totalOrders = customers.reduce((total, customer) => total + customer.orderCount, 0);
  const completedOrders = customers.reduce(
    (total, customer) => total + customer.completedOrderCount,
    0
  );
  const topCustomers = customers
    .filter((customer) => customer.totalEarning > 0)
    .slice()
    .sort((firstCustomer, secondCustomer) => secondCustomer.totalEarning - firstCustomer.totalEarning)
    .slice(0, 5);
  const maxEarning = Math.max(...topCustomers.map((customer) => customer.totalEarning), 0);
  const mostLucrativeCustomer = topCustomers[0];

  return (
    <section className="customer-overview" aria-label="Customer sales overview">
      <article className="overview-card customer-count-card">
        <span className="overview-label">Total</span>
        <strong className="overview-value">{customers.length}</strong>
        <p>customer profiles</p>
      </article>

      <article className="overview-card sales-overview-card">
        <div className="sales-overview-header">
          <div>
            <span className="overview-label">Total earning</span>
            <strong className="overview-value">{formatCurrency(totalEarning)}</strong>
          </div>
          <div className="sales-overview-meta">
            <span>{completedOrders} of {totalOrders} completed</span>
            <strong>
              {mostLucrativeCustomer ? mostLucrativeCustomer.name : "No sales yet"}
            </strong>
          </div>
        </div>

        <div className="sales-chart" aria-label="Top customer earnings">
          {topCustomers.length ? (
            topCustomers.map((customer) => (
              <div key={customer.id} className="sales-chart-row">
                <span>{customer.name}</span>
                <div className="sales-chart-track">
                  <div
                    className="sales-chart-bar"
                    style={{ width: `${getBarWidth(customer.totalEarning, maxEarning)}%` }}
                  />
                </div>
                <strong>{formatCompactCurrency(customer.totalEarning)}</strong>
              </div>
            ))
          ) : (
            <div className="sales-chart-empty">
              <span>No selling data yet</span>
              <div className="sales-chart-track" />
              <strong>{formatCurrency(0)}</strong>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

function getBarWidth(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((value / maxValue) * 100));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    style: "currency",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    notation: "compact",
    style: "currency",
    maximumFractionDigits: 1,
  }).format(value);
}
