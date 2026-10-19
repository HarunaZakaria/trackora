"use client";

import { useMemo, useState } from "react";
import { EmptyState, MetricCard, PageHeader } from "../../components/ui";
import { formatMoney, useStore } from "../../lib/store";

type CartLine = { productId: string; quantity: number };

export default function Sales() {
  const { products, customers, sales, currency, currentTime, checkout } = useStore();
  const [query, setQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);

  const matchingProducts = useMemo(() => products.filter((product) =>
    [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())),
  ), [products, query]);
  const cartItems = cart.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? { ...line, product, lineTotal: product.sellingPrice * line.quantity } : null;
  }).filter((line): line is NonNullable<typeof line> => line !== null);
  const total = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const amount = amountPaid === "" ? (paymentMethod === "Credit" ? 0 : total) : Number(amountPaid);
  const todaySales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === new Date(currentTime).toDateString());
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const visibleSales = sales.filter((sale) => [sale.receipt, sale.customer].some((value) => value.toLowerCase().includes(historyQuery.toLowerCase())));

  function addToCart(productId: string) {
    setError("");
    setCart((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) {
        const product = products.find((item) => item.id === productId);
        if (product && existing.quantity >= product.stock) {
          setError(`Only ${product.stock} units are currently in stock.`);
          return current;
        }
        return current.map((line) => line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line);
      }
      return [...current, { productId, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, quantity: number) {
    const product = products.find((item) => item.id === productId);
    if (quantity <= 0) {
      setCart((current) => current.filter((line) => line.productId !== productId));
      return;
    }
    if (product && quantity > product.stock) {
      setError(`Only ${product.stock} units of ${product.name} are in stock.`);
      return;
    }
    setError("");
    setCart((current) => current.map((line) => line.productId === productId ? { ...line, quantity } : line));
  }

  function completeSale() {
    setError("");
    try {
      const newReceipt = checkout(cart, customer, amount, paymentMethod);
      setReceipt(newReceipt);
      setCart([]);
      setCustomer("");
      setAmountPaid("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete the sale.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Point of sale"
        description="Add products to a cart, record payment, and complete a receipt."
        action={<span className="pill success">Stock checked at checkout</span>}
      />
      <div className="metrics-grid">
        <MetricCard label="Today's sales" value={formatMoney(todayTotal, currency)} detail={`${todaySales.length} receipts`} />
        <MetricCard label="All receipts" value={sales.length.toString()} />
        <MetricCard label="Unpaid balance" value={formatMoney(sales.reduce((sum, sale) => sum + sale.total - sale.amountPaid, 0), currency)} />
        <MetricCard label="Products available" value={products.length.toString()} />
      </div>

      <div className="pos-grid">
        <section className="panel">
          <div className="panel-header">
            <div><h4>Products</h4><p className="muted">Select an item to add it to this sale.</p></div>
            <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU" aria-label="Search products for sale" /></label>
          </div>
          {matchingProducts.length === 0 ? <EmptyState title="No matching products" detail="Adjust the search, or add products in inventory." /> : (
            <div className="product-picker">
              {matchingProducts.map((product) => (
                <button className="product-option" key={product.id} onClick={() => addToCart(product.id)} disabled={product.stock <= 0} type="button">
                  <span className="product-option-icon">{product.name.slice(0, 1).toUpperCase()}</span>
                  <span className="product-option-copy"><strong>{product.name}</strong><small>{product.sku} · {product.stock} {product.unit} in stock</small></span>
                  <span className="product-option-price">{formatMoney(product.sellingPrice, currency)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel cart-panel">
          <div className="panel-header"><div><h4>Current sale</h4><p className="muted">{cartItems.reduce((sum, item) => sum + item.quantity, 0)} items</p></div><button type="button" className="text-button" onClick={() => { setCart([]); setError(""); }}>Clear cart</button></div>
          {cartItems.length === 0 ? <EmptyState title="Your cart is empty" detail="Choose a product to start a new sale." /> : (
            <div className="cart-lines">
              {cartItems.map(({ product, quantity, lineTotal }) => (
                <div className="cart-line" key={product.id}>
                  <div className="txn-meta"><strong>{product.name}</strong><span>{formatMoney(product.sellingPrice, currency)} each</span></div>
                  <div className="quantity-control"><button type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, quantity - 1)}>−</button><span>{quantity}</span><button type="button" aria-label={`Add one ${product.name}`} onClick={() => changeQuantity(product.id, quantity + 1)}>+</button></div>
                  <strong>{formatMoney(lineTotal, currency)}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="cart-form">
            <label className="field"><span>Customer</span><select value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="">Walk-in customer</option>{customers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
            <label className="field"><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash</option><option>Mobile money</option><option>Card</option><option>Bank transfer</option><option>Credit</option></select></label>
            <label className="field"><span>Amount paid</span><input type="number" min="0" max={total} step="0.01" value={amountPaid} placeholder={(paymentMethod === "Credit" ? "0" : total.toFixed(2))} onChange={(event) => setAmountPaid(event.target.value)} /></label>
            <div className="cart-total"><span>Total due</span><strong>{formatMoney(total, currency)}</strong></div>
            <div className="cart-total secondary-total"><span>Balance</span><strong>{formatMoney(Math.max(0, total - amount), currency)}</strong></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn primary full-width" type="button" onClick={completeSale} disabled={!cartItems.length}>Complete sale</button>
          </div>
        </section>
      </div>

      {receipt && <div className="success-banner" role="status"><span>Sale completed. Receipt {receipt} has been recorded and stock updated.</span><button type="button" className="text-button" onClick={() => window.print()}>Print receipt</button><button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setReceipt(null)}>×</button></div>}

      <section className="panel section-gap">
        <div className="panel-header"><div><h4>Sales history</h4><p className="muted">Receipts recorded on this device.</p></div><label className="search-box"><span>⌕</span><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search receipt or customer" aria-label="Search sales history" /></label></div>
        {visibleSales.length === 0 ? <EmptyState title="No matching sales" detail="Try a different receipt number or customer name." /> : (
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Receipt</th><th>Customer</th><th>Items</th><th>Total</th><th>Paid</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{visibleSales.map((sale) => <tr key={sale.id}>
              <td>{sale.receipt}</td><td>{sale.customer}</td><td>{sale.lines.reduce((sum, line) => sum + line.quantity, 0)}</td>
              <td>{formatMoney(sale.total, currency)}</td><td>{formatMoney(sale.amountPaid, currency)}</td>
              <td><span className={`status-tag ${sale.amountPaid >= sale.total ? "success" : "warning"}`}>{sale.amountPaid >= sale.total ? "Paid" : "Part paid"}</span></td>
              <td>{new Date(sale.createdAt).toLocaleString()}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
