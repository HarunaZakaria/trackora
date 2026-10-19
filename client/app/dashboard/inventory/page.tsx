"use client";

import { useMemo, useState, type FormEvent } from "react";
import { EmptyState, MetricCard, Modal, PageHeader } from "../../components/ui";
import { formatMoney, useStore, type Product } from "../../lib/store";

const blankProduct = {
  name: "",
  sku: "",
  category: "",
  unit: "Each",
  stock: 0,
  reorderLevel: 5,
  costPrice: 0,
  sellingPrice: 0,
};

export default function Inventory() {
  const { products, currency, saveProduct, deleteProduct } = useStore();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankProduct);
  const [error, setError] = useState("");

  const categories = Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
  const filtered = useMemo(() => products.filter((product) => {
    const query = search.trim().toLowerCase();
    const matches = !query || [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(query));
    return matches && (stockFilter === "all" || (stockFilter === "low" ? product.stock <= product.reorderLevel : product.category === stockFilter));
  }), [products, search, stockFilter]);
  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.costPrice, 0);
  const lowStock = products.filter((product) => product.stock <= product.reorderLevel).length;

  function openNew() {
    setEditing(null);
    setForm(blankProduct);
    setError("");
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
    });
    setError("");
    setShowForm(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (products.some((product) => product.sku.toLowerCase() === form.sku.trim().toLowerCase() && product.id !== editing?.id)) {
      setError("That SKU is already in use.");
      return;
    }
    if (form.sellingPrice < 0 || form.costPrice < 0 || form.stock < 0 || form.reorderLevel < 0) {
      setError("Stock and prices cannot be negative.");
      return;
    }
    saveProduct({ ...form, name: form.name.trim(), sku: form.sku.trim(), category: form.category.trim() }, editing?.id);
    setShowForm(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock overview"
        description="Search products, track reorder levels, and update your catalog."
        action={<button className="btn primary" onClick={openNew} type="button">Add product</button>}
      />
      <div className="metrics-grid">
        <MetricCard label="Products" value={products.length.toLocaleString()} />
        <MetricCard label="Stock value" value={formatMoney(inventoryValue, currency)} />
        <MetricCard label="Low stock" value={lowStock.toString()} detail="At or below reorder level" />
        <MetricCard label="Units on hand" value={products.reduce((sum, product) => sum + product.stock, 0).toLocaleString()} />
      </div>

      <section className="panel">
        <div className="toolbar">
          <div>
            <h4>Inventory items</h4>
            <p className="muted">{filtered.length} of {products.length} products</p>
          </div>
          <div className="toolbar-actions">
            <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU, category" aria-label="Search inventory" /></label>
            <select className="dropdown" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filter inventory">
              <option value="all">All products</option>
              <option value="low">Low stock</option>
              {categories.map((category) => <option value={category} key={category}>{category}</option>)}
            </select>
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState title="No matching products" detail="Try a different search or add a product to your catalog." /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Cost</th><th>Selling price</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong><small className="table-subtitle">{product.unit}</small></td>
                    <td>{product.sku}</td><td>{product.category || "—"}</td><td>{product.stock}</td>
                    <td>{formatMoney(product.costPrice, currency)}</td><td>{formatMoney(product.sellingPrice, currency)}</td>
                    <td><span className={`status-tag ${product.stock <= product.reorderLevel ? "warning" : "success"}`}>{product.stock <= product.reorderLevel ? "Low stock" : "In stock"}</span></td>
                    <td><div className="row-actions"><button className="btn small secondary" onClick={() => openEdit(product)}>Edit</button><button className="btn small danger-button" onClick={() => window.confirm(`Remove ${product.name} from inventory?`) && deleteProduct(product.id)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && <Modal title={editing ? "Edit product" : "Add product"} onClose={() => setShowForm(false)}>
        <form className="form-grid" onSubmit={submit}>
          <label className="field"><span>Product name *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="field"><span>SKU *</span><input required value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
          <label className="field"><span>Category</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
          <label className="field"><span>Unit</span><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
          <label className="field"><span>Quantity in stock</span><input type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} /></label>
          <label className="field"><span>Reorder level</span><input type="number" min="0" step="1" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: Number(event.target.value) })} /></label>
          <label className="field"><span>Cost price</span><input type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: Number(event.target.value) })} /></label>
          <label className="field"><span>Selling price</span><input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: Number(event.target.value) })} /></label>
          {error && <p className="form-error form-span">{error}</p>}
          <div className="modal-actions form-span"><button className="btn secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="btn primary" type="submit">{editing ? "Save product" : "Add product"}</button></div>
        </form>
      </Modal>}
    </>
  );
}
