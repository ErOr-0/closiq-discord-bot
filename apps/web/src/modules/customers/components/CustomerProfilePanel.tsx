import { EmptyState } from "../../../shared/components/EmptyState";
import type { Customer } from "../types";

type CustomerProfilePanelProps = {
  customer: Customer | null;
  onEdit?: (customer: Customer) => void;
};

export function CustomerProfilePanel({ customer, onEdit }: CustomerProfilePanelProps) {
  if (!customer) {
    return (
      <EmptyState
        title="Select a customer"
        message="Customer details and order value will appear here."
      />
    );
  }

  return (
    <aside className="customer-profile">
      <div className="customer-profile-header">
        <span className="customer-profile-avatar" aria-hidden="true">
          {getInitials(customer.name)}
        </span>
        <div>
          <h2>{customer.name}</h2>
          <p>{customer.email}</p>
        </div>
        {onEdit ? (
          <button className="button secondary small" type="button" onClick={() => onEdit(customer)}>
            Edit
          </button>
        ) : null}
      </div>

      <div className="profile-stat-grid">
        <div>
          <span>Total earning</span>
          <strong>{formatCurrency(customer.totalEarning)}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{customer.completedOrderCount}</strong>
        </div>
      </div>

      <dl className="profile-details">
        <div>
          <dt>Phone</dt>
          <dd>{customer.phone || "Not added"}</dd>
        </div>
        <div>
          <dt>Last completed order</dt>
          <dd>
            {customer.lastCompletedOrderAt
              ? formatDate(customer.lastCompletedOrderAt)
              : "No completed orders"}
          </dd>
        </div>
        <div>
          <dt>Customer since</dt>
          <dd>{formatDate(customer.createdAt)}</dd>
        </div>
      </dl>
    </aside>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    style: "currency",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
