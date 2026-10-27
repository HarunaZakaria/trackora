"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import Navbar from "./Navbar";
import { formatMoney, StoreProvider, useStore } from "../lib/store";
import { AuthProvider, DEMO_BUSINESS_ID, useAuth } from "../lib/auth";

const pageTitles: Record<string, string> = {
  "/dashboard": "Business overview",
  "/dashboard/sales": "Sales & point of sale",
  "/dashboard/inventory": "Inventory",
  "/dashboard/purchases": "Purchases",
  "/dashboard/suppliers": "Suppliers",
  "/dashboard/customers": "Customers",
  "/dashboard/expenses": "Expenses",
  "/dashboard/report": "Reports",
  "/dashboard/settings": "Settings",
};

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const store = useStore();
  const { signOut } = useAuth();

  function exportSales() {
    const rows = [
      [
        "Receipt",
        "Date",
        "Customer",
        "Items",
        "Total",
        "Paid",
        "Payment method",
      ],
      ...store.sales.map((sale) => [
        sale.receipt,
        new Date(sale.createdAt).toLocaleString(),
        sale.customer,
        sale.lines.reduce((total, line) => total + line.quantity, 0).toString(),
        sale.total.toFixed(2),
        sale.amountPaid.toFixed(2),
        sale.paymentMethod,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "stockora-sales.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className={`app-shell ${store.preferences.darkMode ? "dark-theme" : ""}`}
    >
      <Navbar />
      <div className="page-shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">{store.businessName}</span>
            <h2>{pageTitles[pathname] ?? "Stockora"}</h2>
          </div>
          <div className="topbar-actions">
            <button
              className="btn secondary"
              onClick={exportSales}
              type="button"
            >
              Export sales
            </button>
            <button
              className="btn secondary"
              onClick={() => {
                signOut();
                router.replace("/login");
              }}
              type="button"
            >
              Sign out
            </button>
            <Link className="btn primary" href="/dashboard/sales">
              New sale
            </Link>
          </div>
        </header>
        {!store.ready && (
          <div className="storage-banner">Loading your saved browser data…</div>
        )}
        {store.storageError && (
          <div className="storage-banner error" role="alert">
            {store.storageError}
          </div>
        )}
        <main className="main-content">{children}</main>
        <footer className="app-footer">
          Demo mode · Data is stored in this browser · Not connected to a server
          <span>
            {store.sales.length} sales ·{" "}
            {formatMoney(
              store.sales.reduce((sum, sale) => sum + sale.total, 0),
              store.currency,
            )}
          </span>
        </footer>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppRouter>{children}</AppRouter>
    </AuthProvider>
  );
}

function AppRouter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, business, ready } = useAuth();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      if (!isAuthPage) router.replace("/login");
      return;
    }
    if (user.role === "super-admin") {
      if (pathname !== "/admin") router.replace("/admin");
      return;
    }
    if (business?.status !== "active") {
      router.replace("/login");
      return;
    }
    if (isAuthPage || pathname === "/admin") router.replace("/dashboard");
  }, [business?.status, isAuthPage, pathname, ready, router, user]);

  if (!ready) return <div className="auth-loading">Loading Stockora…</div>;
  if (isAuthPage && !user) return children;
  if (user?.role === "super-admin" && pathname === "/admin") return children;
  if (
    user?.role === "owner" &&
    business?.status === "active" &&
    pathname !== "/admin" &&
    !isAuthPage
  ) {
    return (
      <StoreProvider
        key={business.id}
        businessId={business.id}
        businessName={business.name}
        currency={business.currency}
        sampleData={business.id === DEMO_BUSINESS_ID}
      >
        <ShellContent>{children}</ShellContent>
      </StoreProvider>
    );
  }
  return <div className="auth-loading">Preparing your workspace…</div>;
}
