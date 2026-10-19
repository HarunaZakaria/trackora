"use client";

import { useMemo, useState } from "react";
import { MetricCard, PageHeader } from "../../components/ui";
import { formatMoney, useStore } from "../../lib/store";

export default function Reports() {
  const { sales, expenses, products, customers, currency, currentTime } = useStore();
  const [period, setPeriod] = useState("30");
  const cutoff = useMemo(() => {
    if (period === "all") return new Date(0);
    const date = new Date(currentTime);
    date.setDate(date.getDate() - Number(period));
    date.setHours(0, 0, 0, 0);
    return date;
  }, [period, currentTime]);
  const periodSales = sales.filter((sale) => new Date(sale.createdAt) >= cutoff);
  const periodExpenses = expenses.filter((expense) => new Date(`${expense.date}T00:00:00`) >= cutoff);
  const revenue = periodSales.reduce((sum, sale) => sum + sale.total, 0);
  const costs = periodSales.reduce((sum, sale) => sum + sale.lines.reduce((lineSum, line) => {
    const product = products.find((item) => item.id === line.productId);
    return lineSum + line.quantity * (product?.costPrice ?? 0);
  }, 0), 0);
  const expenseTotal = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const grossProfit = revenue - costs;
  const netProfit = grossProfit - expenseTotal;
  const outstanding = customers.reduce((sum, customer) => sum + customer.balance, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(currentTime);
    date.setDate(date.getDate() - (6 - index));
    const total = sales.filter((sale) => new Date(sale.createdAt).toDateString() === date.toDateString()).reduce((sum, sale) => sum + sale.total, 0);
    return { label: date.toLocaleDateString(undefined, { weekday: "short" }), total };
  });
  const max = Math.max(...days.map((day) => day.total), 1);

  function exportReport() {
    const rows = [
      ["Metric", "Value"],
      ["Sales revenue", revenue.toFixed(2)],
      ["Estimated cost of goods sold", costs.toFixed(2)],
      ["Estimated gross profit", grossProfit.toFixed(2)],
      ["Recorded expenses", expenseTotal.toFixed(2)],
      ["Estimated net profit", netProfit.toFixed(2)],
      ["Customer balances", outstanding.toFixed(2)],
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "stockora-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader eyebrow="Reports" title="Business analytics" description="Summaries are calculated from saved sales, expense, inventory, and customer records." action={<div className="toolbar-actions"><select className="dropdown" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Reporting period"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All records</option></select><button className="btn primary" type="button" onClick={exportReport}>Export report</button></div>} />
      <div className="metrics-grid">
        <MetricCard label="Sales revenue" value={formatMoney(revenue, currency)} detail={`${periodSales.length} receipts`} />
        <MetricCard label="Est. gross profit" value={formatMoney(grossProfit, currency)} detail="Revenue less estimated item cost" />
        <MetricCard label="Recorded expenses" value={formatMoney(expenseTotal, currency)} detail={`${periodExpenses.length} entries`} />
        <MetricCard label="Customer balances" value={formatMoney(outstanding, currency)} detail="Current outstanding total" />
      </div>
      <div className="content-grid">
        <section className="panel">
          <div className="panel-header"><div><h4>Revenue trends</h4><p className="muted">Daily sales for the last 7 days</p></div><span className="pill">{formatMoney(revenue, currency)}</span></div>
          <div className="chart-with-labels">{days.map((day) => (
            <div className="chart-day" key={day.label}><span className="chart-day-value">{day.total ? formatMoney(day.total, currency) : "—"}</span><div className="bar-track"><span style={{ height: `${Math.max(5, day.total / max * 100)}%` }} /></div><small>{day.label}</small></div>
          ))}</div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h4>Profit summary</h4><p className="muted">Management estimate, not accounting output</p></div></div>
          <div className="list-stack">
            <div className="txn-item"><span>Sales revenue</span><strong>{formatMoney(revenue, currency)}</strong></div>
            <div className="txn-item"><span>Estimated cost of goods sold</span><strong>− {formatMoney(costs, currency)}</strong></div>
            <div className="txn-item"><span>Estimated gross profit</span><strong>{formatMoney(grossProfit, currency)}</strong></div>
            <div className="txn-item"><span>Recorded operating expenses</span><strong>− {formatMoney(expenseTotal, currency)}</strong></div>
            <div className="report-total"><span>Estimated net profit</span><strong>{formatMoney(netProfit, currency)}</strong></div>
          </div>
          <p className="muted note">Historical product costs use the current cost price because this demo does not store cost snapshots per sale.</p>
        </section>
      </div>
      <section className="panel section-gap">
        <div className="panel-header"><div><h4>Inventory snapshot</h4><p className="muted">Current stock positions</p></div></div>
        <div className="metrics-grid report-inventory-grid">
          <MetricCard label="Products" value={products.length.toLocaleString()} />
          <MetricCard label="Cost value on hand" value={formatMoney(products.reduce((sum, product) => sum + product.stock * product.costPrice, 0), currency)} />
          <MetricCard label="Low stock items" value={products.filter((product) => product.stock <= product.reorderLevel).length.toString()} />
          <MetricCard label="Pending receivables" value={formatMoney(outstanding, currency)} />
        </div>
      </section>
    </>
  );
}
