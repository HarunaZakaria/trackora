"use client";

import { useMemo, useState, type FormEvent } from "react";
import { EmptyState, MetricCard, Modal, PageHeader } from "../../components/ui";
import { formatMoney, useStore } from "../../lib/store";

export default function Purchases() {
  const { purchases, suppliers, products, currency, createPurchase, receivePurchase } = useStore();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [status, setStatus] = useState<"Received" | "Pending">("Pending");
  const [error, setError] = useState("");

  const filtered = useMemo(() => purchases.filter((purchase) =>
    [purchase.invoice, purchase.supplier, purchase.productName].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())),
  ), [purchases, query]);
  const paidOrReceived = purchases.filter((purchase) => purchase.status === "Received").reduce((sum, purchase) => sum + purchase.total, 0);
  const outstandingOrders = purchases.filter((purchase) => purchase.status === "Pending").length;

  function selectProduct(id: string) {
    setProductId(id);
    const product = products.find((item) => item.id === id);
    if (product) setUnitCost(product.costPrice);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const product = products.find((item) => item.id === productId);
    if (!product || !supplier || quantity <= 0 || unitCost < 0) {
      setError("Choose a supplier and product, then enter a valid quantity and cost.");
      return;
    }
    createPurchase({
      supplier,
      productId: product.id,
      productName: product.name,
      quantity,
      total: quantity * unitCost,
      status,
    });
    setShowForm(false);
    setSupplier("");
    setProductId("");
    setQuantity(1);
    setUnitCost(0);
  }

  return (
    <>
      <PageHeader eyebrow="Purchases" title="Supplier purchases" description="Record deliveries and update inventory when stock arrives." action={<button className="btn primary" type="button" onClick={() => { setError(""); setShowForm(true); }}>Create purchase</button>} />
      <div className="metrics-grid">
        <MetricCard label="Purchase orders" value={purchases.length.toString()} />
        <MetricCard label="Received value" value={formatMoney(paidOrReceived, currency)} />
        <MetricCard label="Awaiting delivery" value={outstandingOrders.toString()} />
        <MetricCard label="Open payables" value={formatMoney(suppliers.reduce((sum, item) => sum + item.balance, 0), currency)} />
      </div>
      <section className="panel">
        <div className="toolbar">
          <div><h4>Purchase history</h4><p className="muted">{filtered.length} purchase orders</p></div>
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, supplier, item" aria-label="Search purchases" /></label>
        </div>
        {filtered.length === 0 ? <EmptyState title="No purchase orders found" detail="Create a purchase order to record supplier stock." /> : (
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Invoice</th><th>Supplier</th><th>Product</th><th>Quantity</th><th>Total</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{filtered.map((purchase) => (
              <tr key={purchase.id}>
                <td>{purchase.invoice}</td><td>{purchase.supplier}</td><td>{purchase.productName}</td><td>{purchase.quantity}</td><td>{formatMoney(purchase.total, currency)}</td><td>{purchase.date}</td>
                <td><span className={`status-tag ${purchase.status === "Received" ? "success" : "warning"}`}>{purchase.status}</span></td>
                <td>{purchase.status === "Pending" ? <button type="button" className="btn small primary" onClick={() => receivePurchase(purchase.id)}>Mark received</button> : <span className="muted">Stock updated</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      {showForm && <Modal title="Create purchase order" onClose={() => setShowForm(false)}>
        <form className="form-grid" onSubmit={submit}>
          <label className="field form-span"><span>Supplier *</span><select required value={supplier} onChange={(event) => setSupplier(event.target.value)}><option value="">Select supplier</option>{suppliers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className="field form-span"><span>Product *</span><select required value={productId} onChange={(event) => selectProduct(event.target.value)}><option value="">Select product</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}</select></label>
          <label className="field"><span>Quantity</span><input required type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
          <label className="field"><span>Unit cost ({currency})</span><input required type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(Number(event.target.value))} /></label>
          <label className="field form-span"><span>Delivery status</span><select value={status} onChange={(event) => setStatus(event.target.value as "Received" | "Pending")}><option value="Pending">Pending delivery</option><option value="Received">Received now</option></select></label>
          <div className="form-span total-preview">Order total <strong>{formatMoney(quantity * unitCost, currency)}</strong></div>
          {error && <p className="form-error form-span">{error}</p>}
          <div className="modal-actions form-span"><button type="button" className="btn secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn primary" type="submit">Save purchase</button></div>
        </form>
      </Modal>}
    </>
  );
}
