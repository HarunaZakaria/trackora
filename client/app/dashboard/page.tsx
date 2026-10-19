"use client";

import Link from "next/link";
import { EmptyState, MetricCard, PageHeader } from "../components/ui";
import { formatMoney, useStore } from "../lib/store";

export default function Dashboard() {
  const { products, sales, expenses, customers, currency, currentTime, preferences } = useStore();
  const today = new Date(currentTime).toDateString();
  const todaySales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === today);
  const salesValue = todaySales.reduce((total, sale) => total + sale.total, 0);
  const expensesToday = expenses
    .filter((expense) => new Date(expense.date).toDateString() === today)
    .reduce((total, expense) => total + expense.amount, 0);
  const lowStock = products.filter((product) => product.stock <= product.reorderLevel);
  const outstanding = customers.reduce((total, customer) => total + customer.balance, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(currentTime);
    day.setDate(day.getDate() - (6 - index));
    const total = sales
      .filter((sale) => new Date(sale.createdAt).toDateString() === day.toDateString())
      .reduce((sum, sale) => sum + sale.total, 0);
    return { label: day.toLocaleDateString(undefined, { weekday: "short" }), total };
  });
  const maxDailySales = Math.max(...days.map((day) => day.total), 1);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Business dashboard"
        description="A live snapshot of the records saved in this browser."
        action={
          <div className="toolbar-actions">
            <Link className="btn secondary" href="/dashboard/inventory">View inventory</Link>
            <Link className="btn primary" href="/dashboard/sales">Start a sale</Link>
          </div>
        }
      />

      <div className="metrics-grid">
        <MetricCard label="Today's sales" value={formatMoney(salesValue, currency)} detail={`${todaySales.length} receipts`} />
        <MetricCard label="Products" value={products.length.toLocaleString()} detail={`${lowStock.length} at or below reorder level`} />
        <MetricCard label="Customer balances" value={formatMoney(outstanding, currency)} detail={`${customers.filter((customer) => customer.balance > 0).length} customers with balances`} />
        <MetricCard label="Today's expenses" value={formatMoney(expensesToday, currency)} detail={`${expenses.filter((expense) => new Date(expense.date).toDateString() === today).length} recorded`} />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div><h4>Sales performance</h4><p className="muted">Sales totals for the last 7 days</p></div>
            <Link className="text-link" href="/dashboard/report">View reports</Link>
          </div>
          <div className="chart-with-labels">
            {days.map((day) => (
              <div className="chart-day" key={day.label}>
                <span className="chart-day-value">{day.total ? formatMoney(day.total, currency) : "—"}</span>
                <div className="bar-track">
                  <span style={{ height: `${Math.max(5, (day.total / maxDailySales) * 100)}%` }} />
                </div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </section>

        {preferences.lowStockAlerts && <section className="panel">
          <div className="panel-header">
            <div><h4>Low stock alerts</h4><p className="muted">Products at or below reorder level</p></div>
            <span className={`pill ${lowStock.length ? "warning" : "success"}`}>{lowStock.length} items</span>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState title="Stock levels look good" detail="No products currently need replenishment." />
          ) : (
            <div className="list-stack">
              {lowStock.slice(0, 5).map((product) => (
                <div className="txn-item" key={product.id}>
                  <div className="txn-meta"><strong>{product.name}</strong><span>{product.sku} · reorder at {product.reorderLevel}</span></div>
                  <span className="status-tag warning">{product.stock} {product.unit}</span>
                </div>
              ))}
              {lowStock.length > 5 && <Link className="text-link" href="/dashboard/inventory">See all {lowStock.length} alerts</Link>}
            </div>
          )}
        </section>}
      </div>

      <section className="panel section-gap">
        <div className="panel-header">
          <div><h4>Recent sales</h4><p className="muted">Latest receipts recorded</p></div>
          <Link className="text-link" href="/dashboard/sales">Open sales history</Link>
        </div>
        {sales.length === 0 ? (
          <EmptyState title="No sales yet" detail="Create your first receipt from the point of sale." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Receipt</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Date</th></tr></thead>
              <tbody>
                {sales.slice(0, 6).map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.receipt}</td>
                    <td>{sale.customer}</td>
                    <td>{sale.lines.reduce((total, line) => total + line.quantity, 0)}</td>
                    <td>{formatMoney(sale.total, currency)}</td>
                    <td><span className={`status-tag ${sale.amountPaid >= sale.total ? "success" : "warning"}`}>{sale.amountPaid >= sale.total ? "Paid" : "Partially paid"}</span></td>
                    <td>{new Date(sale.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
