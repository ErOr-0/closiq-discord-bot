import { EmptyState } from "../../../shared/components/EmptyState";
import type { Customer, CustomerOrder } from "../types";
import { CustomerOrdersLoader } from "./CustomerOrdersLoader";

type CustomerOrdersPanelProps = {
  customer: Customer | null;
  completingOrderId: string | null;
  loading: boolean;
  orders: CustomerOrder[];
  onCompleteOrder: (order: CustomerOrder) => void;
};

export function CustomerOrdersPanel({
  customer,
  completingOrderId,
  loading,
  orders,
  onCompleteOrder,
}: CustomerOrdersPanelProps) {
  if (!customer) {
    return (
      <EmptyState
        title="Select a customer"
        message="Orders and completion actions will appear here."
      />
    );
  }

  if (loading) {
    return <CustomerOrdersLoader />;
  }

  if (!orders.length) {
    return (
      <EmptyState
        title="No orders"
        message="This customer does not have any recorded orders yet."
      />
    );
  }

  return (
    <div className="customer-order-list">
      {orders.map((order) => {
        const isCompleted = order.status === "delivered" && Boolean(order.completedAt);
        const canComplete = !isCompleted && order.status !== "cancelled";

        return (
          <article key={order.id} className="customer-order-card">
            <div className="order-card-main">
              <div>
                <strong>{formatOrderTitle(order)}</strong>
                <small>Created {formatDate(order.createdAt)}</small>
              </div>
              <span className={`order-status order-status-${isCompleted ? "delivered" : order.status}`}>
                {getOrderStatusLabel(order, isCompleted)}
              </span>
            </div>

            <div className="order-card-meta">
              <span>{formatCurrency(order.totalAmount)}</span>
              <span>{order.shippingAddress}</span>
              <span>
                {isCompleted ? `Completed ${formatDate(order.completedAt as string)}` : "Not completed"}
              </span>
            </div>

            {canComplete ? (
              <button
                className="button small"
                disabled={completingOrderId === order.id}
                type="button"
                onClick={() => onCompleteOrder(order)}
              >
                {completingOrderId === order.id ? "Completing..." : "Mark completed"}
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function getOrderStatusLabel(order: CustomerOrder, isCompleted: boolean) {
  if (isCompleted) {
    return "Completed";
  }

  if (order.status === "delivered") {
    return "Needs completion";
  }

  return order.status;
}

function formatOrderTitle(order: CustomerOrder) {
  return order.items
    .map((item) => `${item.quantity} ${item.productName}`)
    .join(", ");
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
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
