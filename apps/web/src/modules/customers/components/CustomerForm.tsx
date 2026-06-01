import { FormEvent, useEffect, useState } from "react";

import type { Customer, CustomerInput } from "../types";

type CustomerFormProps = {
  customer?: Customer | null;
  submitting: boolean;
  onCancelEdit: () => void;
  onSubmit: (input: CustomerInput) => Promise<void>;
};

const emptyCustomerInput: CustomerInput = {
  name: "",
  email: "",
  phone: "",
};

export function CustomerForm({
  customer,
  submitting,
  onCancelEdit,
  onSubmit,
}: CustomerFormProps) {
  const [formValue, setFormValue] = useState<CustomerInput>(emptyCustomerInput);

  useEffect(() => {
    if (!customer) {
      setFormValue(emptyCustomerInput);
      return;
    }

    setFormValue({
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? "",
    });
  }, [customer]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(formValue);

    if (!customer) {
      setFormValue(emptyCustomerInput);
    }
  }

  const submitLabel = customer ? "Save customer" : "Create customer";

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input
            required
            placeholder="Ada Lovelace"
            value={formValue.name}
            onChange={(event) => setFormValue({ ...formValue, name: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            required
            type="email"
            placeholder="ada@example.com"
            value={formValue.email}
            onChange={(event) => setFormValue({ ...formValue, email: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Phone</span>
          <input
            placeholder="+1 555 0134"
            value={formValue.phone ?? ""}
            onChange={(event) => setFormValue({ ...formValue, phone: event.target.value })}
          />
        </label>

      </div>

      <div className="form-actions">
        {customer ? (
          <button className="button secondary" type="button" onClick={onCancelEdit}>
            Cancel
          </button>
        ) : null}
        <button className="button" disabled={submitting} type="submit">
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
