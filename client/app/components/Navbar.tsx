import Link from "next/link";
import Logo from "./Logo";
export default function Navbar() {
  return (
    <div>
      <div>
        <Logo />
      </div>
      <nav>
        <Link href={"/dashboard"}>Dashboard</Link>
        <Link href={"/dashboard/sales"}>Sales</Link>
        <Link href={"/dashboard/inventory"}>Inventory</Link>
        <Link href={"/dashboard/suppliers"}>Suppliers</Link>
        <Link href={"/dashboard/customers"}>Customers</Link>
        <Link href={"/dashboard/expenses"}>Expenses</Link>
        <Link href={"/dashboard/report"}>Report</Link>
      </nav>
    </div>
  );
}
