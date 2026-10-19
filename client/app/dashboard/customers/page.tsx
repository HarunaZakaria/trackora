"use client";

import { useMemo, useState, type FormEvent } from "react";
import { EmptyState, MetricCard, Modal, PageHeader } from "../../components/ui";
import { formatMoney, useStore, type Customer } from "../../lib/store";

const emptyCustomer = { name: "", phone: "", email: "", balance: 0 };

export default function Customers() {
  const { customers, sales, currency, saveCustomer } = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCustomer);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => customers.filter((customer) =>
    [customer.name, customer.phone, customer.email].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())),
  ), [customers, query]);
  const totalBalance = customers.reduce((sum, customer) => sum + customer.balance, 0);

  function openForm(customer?: Customer) {
    setEditing(customer ?? null);
    setForm(customer ? { name: customer.name, phone: customer.phone, email: customer.email, balance: customer.balance } : emptyCustomer);
    setMessage("");
    setShowForm(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveCustomer({ ...form, name: form.name.trim() }, editing?.id);
    setShowForm(false);
  }

  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentCustomer) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > paymentCustomer.balance) {
      setMessage("Enter a payment greater than zero and no more than the outstanding balance.");
      return;
    }
    saveCustomer({ ...paymentCustomer, balance: paymentCustomer.balance - amount }, paymentCustomer.id);
    setPaymentCustomer(null);
    setPaymentAmount("");
    setMessage(`Payment of ${formatMoney(amount, currency)} recorded.`);
  }

  return (
    <>
      <PageHeader eyebrow="Customers" title="Customer accounts" description="Manage customer records and collect payments on outstanding balances." action={<button className="btn primary" onClick={() => openForm()} type="button">Add customer</button>} />
      <div className="metrics-grid">
        <MetricCard label="Customer accounts" value={customers.length.toLocaleString()} />
        <MetricCard label="Open balances" value={formatMoney(totalBalance, currency)} detail={`${customers.filter((customer) => customer.balance > 0).length} accounts owing`} />
        <MetricCard label="Sales to customers" value={sales.length.toLocaleString()} />
        <MetricCard label="Settled accounts" value={customers.filter((customer) => customer.balance === 0).length.toLocaleString()} />
      </div>
      {message && <div className="success-banner" role="status">{message}<button className="icon-button" onClick={() => setMessage("")} aria-label="Dismiss" type="button">×</button></div>}
      <section className="panel">
        <div className="toolbar">
          <div><h4>Customers</h4><p className="muted">{filtered.length} accounts</p></div>
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, email" aria-label="Search customers" /></label>
        </div>
        {filtered.length === 0 ? <EmptyState title="No matching customers" detail="Try another search or add a customer account." /> : (
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map((customer) => (
              <tr key={customer.id}>
                <td><strong>{customer.name}</strong></td><td>{customer.phone || "—"}</td><td>{customer.email || "—"}</td>
                <td>{formatMoney(customer.balance, currency)}</td>
                <td><span className={`status-tag ${customer.balance > 0 ? "warning" : "success"}`}>{customer.balance > 0 ? "Balance due" : "Settled"}</span></td>
                <td><div className="row-actions">{customer.balance > 0 && <button className="btn small primary" type="button" onClick={() => { setPaymentCustomer(customer); setPaymentAmount(""); setMessage(""); }}>Record payment</button>}<button className="btn small secondary" type="button" onClick={() => openForm(customer)}>Edit</button></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      {showForm && <Modal title={editing ? "Edit customer" : "Add customer"} onClose={() => setShowForm(false)}>
        <form className="form-grid" onSubmit={submit}>
          <label className="field form-span"><span>Customer name *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="field"><span>Phone</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="field form-span"><span>Opening balance</span><input type="number" min="0" step="0.01" value={form.balance} onChange={(event) => setForm({ ...form, balance: Number(event.target.value) })} /></label>
          <div className="modal-actions form-span"><button className="btn secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="btn primary" type="submit">{editing ? "Save customer" : "Add customer"}</button></div>
        </form>
      </Modal>}
      {paymentCustomer && <Modal title={`Record payment · ${paymentCustomer.name}`} onClose={() => setPaymentCustomer(null)}>
        <form className="form-grid" onSubmit={recordPayment}>
          <p className="muted form-span">Outstanding balance: <strong>{formatMoney(paymentCustomer.balance, currency)}</strong></p>
          <label className="field form-span"><span>Payment amount</span><input autoFocus required type="number" min="0.01" max={paymentCustomer.balance} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
          {message && <p className="form-error form-span">{message}</p>}
          <div className="modal-actions form-span"><button className="btn secondary" type="button" onClick={() => setPaymentCustomer(null)}>Cancel</button><button className="btn primary" type="submit">Record payment</button></div>
        </form>
      </Modal>}
    </>
  );
}
