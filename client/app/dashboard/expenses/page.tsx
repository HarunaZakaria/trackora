"use client";

import { useMemo, useState, type FormEvent } from "react";
import { EmptyState, MetricCard, Modal, PageHeader } from "../../components/ui";
import { formatMoney, useStore } from "../../lib/store";

const blankExpense = {
  category: "Operations",
  description: "",
  amount: 0,
  date: "2026-10-18",
  method: "Cash",
};

export default function Expenses() {
  const { expenses, currency, currentTime, saveExpense, deleteExpense } = useStore();
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankExpense);
  const [error, setError] = useState("");
  const currentMonth = currentTime.slice(0, 7);
  const filtered = useMemo(() => expenses.filter((expense) => {
    const matchesQuery = [expense.category, expense.description, expense.method].some((value) => value.toLowerCase().includes(query.trim().toLowerCase()));
    const matchesPeriod = period === "all" || (period === "month" ? expense.date.startsWith(currentMonth) : expense.date === currentTime.slice(0, 10));
    return matchesQuery && matchesPeriod;
  }), [expenses, query, period, currentMonth, currentTime]);
  const monthTotal = expenses.filter((expense) => expense.date.startsWith(currentMonth)).reduce((sum, expense) => sum + expense.amount, 0);
  const topCategory = Object.entries(expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
    return totals;
  }, {})).sort((a, b) => b[1] - a[1])[0];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.amount <= 0) {
      setError("Expense amount must be greater than zero.");
      return;
    }
    saveExpense({ ...form, description: form.description.trim() });
    setShowForm(false);
    setForm(blankExpense);
  }

  return (
    <>
      <PageHeader eyebrow="Expenses" title="Operating costs" description="Record, categorize, and review the costs of running your business." action={<button className="btn primary" type="button" onClick={() => { setError(""); setForm({ ...blankExpense, date: currentTime.slice(0, 10) }); setShowForm(true); }}>Record expense</button>} />
      <div className="metrics-grid">
        <MetricCard label="Expenses this month" value={formatMoney(monthTotal, currency)} />
        <MetricCard label="Records this month" value={expenses.filter((expense) => expense.date.startsWith(currentMonth)).length.toString()} />
        <MetricCard label="Largest category" value={topCategory?.[0] ?? "—"} detail={topCategory ? formatMoney(topCategory[1], currency) : "No recorded expenses"} />
        <MetricCard label="Average expense" value={formatMoney(expenses.length ? expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length : 0, currency)} />
      </div>
      <section className="panel">
        <div className="toolbar">
          <div><h4>Expense log</h4><p className="muted">{filtered.length} entries</p></div>
          <div className="toolbar-actions">
            <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses" aria-label="Search expenses" /></label>
            <select className="dropdown" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filter expense period"><option value="all">All dates</option><option value="month">This month</option><option value="today">Today</option></select>
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState title="No expenses found" detail="Change your filters or record an expense." /> : (
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Category</th><th>Description</th><th>Amount</th><th>Date</th><th>Payment method</th><th>Action</th></tr></thead>
            <tbody>{filtered.map((expense) => (
              <tr key={expense.id}><td>{expense.category}</td><td>{expense.description}</td><td>{formatMoney(expense.amount, currency)}</td><td>{expense.date}</td><td>{expense.method}</td>
                <td><button type="button" className="btn small danger-button" onClick={() => window.confirm(`Delete the expense “${expense.description}”?`) && deleteExpense(expense.id)}>Delete</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      {showForm && <Modal title="Record expense" onClose={() => setShowForm(false)}>
        <form className="form-grid" onSubmit={submit}>
          <label className="field"><span>Category *</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Operations</option><option>Inventory</option><option>Staff</option><option>Rent</option><option>Utilities</option><option>Transport</option><option>Other</option></select></label>
          <label className="field"><span>Amount ({currency}) *</span><input required type="number" min="0.01" step="0.01" value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></label>
          <label className="field form-span"><span>Description *</span><input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="field"><span>Date *</span><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <label className="field"><span>Payment method</span><select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}><option>Cash</option><option>Mobile money</option><option>Card</option><option>Bank transfer</option></select></label>
          {error && <p className="form-error form-span">{error}</p>}
          <div className="modal-actions form-span"><button type="button" className="btn secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn primary" type="submit">Save expense</button></div>
        </form>
      </Modal>}
    </>
  );
}
