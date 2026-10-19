"use client";

import { useMemo, useState, type FormEvent } from "react";
import { EmptyState, MetricCard, Modal, PageHeader } from "../../components/ui";
import { formatMoney, useStore, type Supplier } from "../../lib/store";

const blankSupplier = { name: "", contact: "", phone: "", email: "", balance: 0 };

export default function Suppliers() {
  const { suppliers, purchases, currency, preferences, saveSupplier } = useStore();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(blankSupplier);
  const [paymentTarget, setPaymentTarget] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const filtered = useMemo(() => suppliers.filter((supplier) =>
    [supplier.name, supplier.contact, supplier.phone].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())),
  ), [suppliers, query]);
  const payables = suppliers.reduce((sum, supplier) => sum + supplier.balance, 0);

  function openForm(supplier?: Supplier) {
    setEditing(supplier ?? null);
    setForm(supplier ? { name: supplier.name, contact: supplier.contact, phone: supplier.phone, email: supplier.email, balance: supplier.balance } : blankSupplier);
    setShowForm(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveSupplier({ ...form, name: form.name.trim() }, editing?.id);
    setShowForm(false);
  }

  function paySupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentTarget) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > paymentTarget.balance) {
      setPaymentError("Enter a payment greater than zero and no more than the outstanding balance.");
      return;
    }
    saveSupplier({ ...paymentTarget, balance: paymentTarget.balance - amount }, paymentTarget.id);
    setPaymentTarget(null);
    setPaymentAmount("");
  }

  return (
    <>
      <PageHeader eyebrow="Suppliers" title="Supplier ledger" description="Keep supplier contacts, payables, and purchasing activity together." action={<button className="btn primary" onClick={() => openForm()} type="button">Add supplier</button>} />
      <div className="metrics-grid">
        <MetricCard label="Suppliers" value={suppliers.length.toLocaleString()} />
        <MetricCard label="Total payables" value={formatMoney(payables, currency)} />
        <MetricCard label="Purchases recorded" value={purchases.length.toLocaleString()} />
        <MetricCard label="Open balances" value={suppliers.filter((supplier) => supplier.balance > 0).length.toLocaleString()} />
      </div>
      {preferences.supplierReminders && (payables > 0 || purchases.some((purchase) => purchase.status === "Pending")) && (
        <div className="reminder-banner" role="status">
          <strong>Supplier follow-up</strong>
          <span>{formatMoney(payables, currency)} in outstanding balances · {purchases.filter((purchase) => purchase.status === "Pending").length} pending deliveries</span>
        </div>
      )}
      <section className="panel">
        <div className="toolbar">
          <div><h4>Supplier directory</h4><p className="muted">{filtered.length} suppliers</p></div>
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search suppliers" aria-label="Search suppliers" /></label>
        </div>
        {filtered.length === 0 ? <EmptyState title="No matching suppliers" detail="Try another search or add a supplier." /> : (
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Outstanding</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map((supplier) => (
              <tr key={supplier.id}>
                <td><strong>{supplier.name}</strong></td><td>{supplier.contact || "—"}</td><td>{supplier.phone || "—"}</td><td>{supplier.email || "—"}</td>
                <td><span className={`status-tag ${supplier.balance > 0 ? "warning" : "success"}`}>{formatMoney(supplier.balance, currency)}</span></td>
                <td><div className="row-actions">{supplier.balance > 0 && <button type="button" className="btn small primary" onClick={() => { setPaymentTarget(supplier); setPaymentAmount(""); setPaymentError(""); }}>Record payment</button>}<button type="button" className="btn small secondary" onClick={() => openForm(supplier)}>Edit</button></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      {showForm && <Modal title={editing ? "Edit supplier" : "Add supplier"} onClose={() => setShowForm(false)}>
        <form className="form-grid" onSubmit={submit}>
          <label className="field form-span"><span>Supplier name *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="field"><span>Contact person</span><input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></label>
          <label className="field"><span>Phone</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="field"><span>Opening payable</span><input type="number" min="0" step="0.01" value={form.balance} onChange={(event) => setForm({ ...form, balance: Number(event.target.value) })} /></label>
          <div className="modal-actions form-span"><button className="btn secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="btn primary" type="submit">{editing ? "Save supplier" : "Add supplier"}</button></div>
        </form>
      </Modal>}
      {paymentTarget && <Modal title={`Pay supplier · ${paymentTarget.name}`} onClose={() => setPaymentTarget(null)}>
        <form className="form-grid" onSubmit={paySupplier}>
          <p className="muted form-span">Outstanding payable: <strong>{formatMoney(paymentTarget.balance, currency)}</strong></p>
          <label className="field form-span"><span>Payment amount</span><input autoFocus required type="number" min="0.01" max={paymentTarget.balance} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
          {paymentError && <p className="form-error form-span" role="alert">{paymentError}</p>}
          <div className="modal-actions form-span"><button type="button" className="btn secondary" onClick={() => setPaymentTarget(null)}>Cancel</button><button className="btn primary" type="submit">Record payment</button></div>
        </form>
      </Modal>}
    </>
  );
}
