import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createCustomer,
  fetchCustomers,
  updateCustomer,
} from "../api/customersApi";
import { completeCustomerOrder, fetchCustomerOrders } from "../api/ordersApi";
import { CustomerForm } from "../components/CustomerForm";
import { CustomerOverview } from "../components/CustomerOverview";
import { CustomerOrdersPanel } from "../components/CustomerOrdersPanel";
import { CustomerProfilePanel } from "../components/CustomerProfilePanel";
import type { Customer, CustomerInput, CustomerOrder } from "../types";

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCustomers = useCallback(async (preferredCustomerId?: string) => {
    setError(null);
    const nextCustomers = await fetchCustomers();
    setCustomers(nextCustomers);
    setSelectedCustomerId((currentId) => {
      if (
        preferredCustomerId &&
        nextCustomers.some((customer) => customer.id === preferredCustomerId)
      ) {
        return preferredCustomerId;
      }

      if (currentId && nextCustomers.some((customer) => customer.id === currentId)) {
        return currentId;
      }

      return nextCustomers[0]?.id;
    });
    return nextCustomers;
  }, []);

  useEffect(() => {
    setLoading(true);
    loadCustomers()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadCustomers]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const loadSelectedCustomerOrders = useCallback(async (customerId: string) => {
    setOrdersLoading(true);
    setError(null);

    try {
      const orders = await fetchCustomerOrders(customerId);
      setSelectedCustomerOrders(orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomerOrders([]);
      return;
    }

    void loadSelectedCustomerOrders(selectedCustomerId);
  }, [loadSelectedCustomerOrders, selectedCustomerId]);

  async function handleSubmitCustomer(input: CustomerInput) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const savedCustomer = editingCustomer
        ? await updateCustomer(editingCustomer.id, input)
        : await createCustomer(input);

      setEditingCustomer(null);
      setSelectedCustomerId(savedCustomer.id);
      setSuccess(editingCustomer ? "Customer updated." : "Customer created.");
      await loadCustomers(savedCustomer.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save customer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteOrder(order: CustomerOrder) {
    setCompletingOrderId(order.id);
    setError(null);
    setSuccess(null);

    try {
      await completeCustomerOrder(order.id);
      setSuccess("Order marked completed. Earnings have been updated.");
      await Promise.all([
        loadCustomers(order.customerId),
        loadSelectedCustomerOrders(order.customerId),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete order");
    } finally {
      setCompletingOrderId(null);
    }
  }

  return (
    <section className="content-stack">
      <header className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Manage customer records and order value from one workspace.</p>
        </div>
        <button className="button secondary" type="button" onClick={() => void loadCustomers()}>
          Refresh
        </button>
      </header>

      <CustomerOverview customers={customers} />

      {error ? <div className="error">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}

      <div className="customer-manager">
        <div className="manager-panel customer-form-panel">
          <div className="panel-heading">
            <h2>{editingCustomer ? "Edit customer" : "Add customer"}</h2>
            {editingCustomer ? <span className="badge">Editing</span> : null}
          </div>
          <CustomerForm
            customer={editingCustomer}
            submitting={submitting}
            onCancelEdit={() => setEditingCustomer(null)}
            onSubmit={handleSubmitCustomer}
          />
        </div>

        <div className="manager-panel customer-orders-panel">
          <div className="panel-heading">
            <h2>Orders</h2>
            {selectedCustomer ? (
              <span className="badge">{selectedCustomerOrders.length} orders</span>
            ) : null}
          </div>

          <label className="field">
            <span>Customer</span>
            <select
              className="search-input"
              disabled={loading || customers.length === 0}
              value={selectedCustomerId ?? ""}
              onChange={(event) => setSelectedCustomerId(event.target.value || undefined)}
            >
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.email}
                </option>
              ))}
            </select>
          </label>

          <CustomerOrdersPanel
            customer={selectedCustomer}
            completingOrderId={completingOrderId}
            loading={ordersLoading}
            orders={selectedCustomerOrders}
            onCompleteOrder={handleCompleteOrder}
          />
        </div>

        <div className="manager-panel customer-profile-panel">
          <CustomerProfilePanel customer={selectedCustomer} onEdit={setEditingCustomer} />
        </div>
      </div>
    </section>
  );
}
