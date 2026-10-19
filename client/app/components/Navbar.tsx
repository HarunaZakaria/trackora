"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { formatMoney, useStore } from "../lib/store";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/sales", label: "Sales" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/purchases", label: "Purchases" },
  { href: "/dashboard/suppliers", label: "Suppliers" },
  { href: "/dashboard/customers", label: "Customers" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/report", label: "Reports" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { businessName, sales, currency, currentTime } = useStore();
  const monthSales = sales
    .filter((sale) => new Date(sale.createdAt).getMonth() === new Date(currentTime).getMonth())
    .reduce((total, sale) => total + sale.total, 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <Logo />

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <span className="eyebrow">Current business</span>
          <strong>{businessName}</strong>
          <small>{formatMoney(monthSales, currency)} sales this month</small>
        </div>
      </div>
    </aside>
  );
}
