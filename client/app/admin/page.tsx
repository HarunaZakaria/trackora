"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth, type Business } from "../lib/auth";

export default function AdminDashboard() {
  const router = useRouter();
  const { businesses, setBusinessStatus, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const filteredBusinesses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return businesses.filter((business) =>
      `${business.name} ${business.ownerName} ${business.ownerEmail}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [businesses, query]);
  const activeCount = businesses.filter(
    (business) => business.status === "active",
  ).length;
  const suspendedCount = businesses.length - activeCount;
  const newestBusiness = [...businesses].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];

  function toggleStatus(business: Business) {
    const nextStatus = business.status === "active" ? "suspended" : "active";
    if (business.id === "demo-brightstone" && nextStatus === "suspended") {
      if (
        !window.confirm(
          "Suspend the sample business? The sample login will be unavailable until reactivated.",
        )
      )
        return;
    }
    setBusinessStatus(business.id, nextStatus);
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="eyebrow">STOCKORA PLATFORM</span>
          <h1>Business console</h1>
          <p>Registration and account status across demo workspaces.</p>
        </div>
        <div className="admin-header-actions">
          <span className="admin-role">Platform admin preview</span>
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              signOut();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="admin-notice" role="note">
        <strong>Preview controls only.</strong> Business records and
        administrator access are stored in this browser, not protected by a
        server.
      </div>
      <section className="admin-metrics" aria-label="Business account summary">
        <article className="admin-metric">
          <span>Registered businesses</span>
          <strong>{businesses.length}</strong>
          <small>All workspaces on this browser</small>
        </article>
        <article className="admin-metric">
          <span>Active</span>
          <strong>{activeCount}</strong>
          <small>Accounts currently enabled</small>
        </article>
        <article className="admin-metric">
          <span>Suspended</span>
          <strong>{suspendedCount}</strong>
          <small>Sign-in disabled</small>
        </article>
        <article className="admin-metric">
          <span>Latest registration</span>
          <strong>
            {newestBusiness
              ? new Date(newestBusiness.createdAt).toLocaleDateString()
              : "—"}
          </strong>
          <small>{newestBusiness?.name ?? "No businesses"}</small>
        </article>
      </section>
      <section className="admin-businesses">
        <div className="admin-list-header">
          <div>
            <h2>Businesses</h2>
            <p>
              {filteredBusinesses.length} workspace
              {filteredBusinesses.length === 1 ? "" : "s"}
            </p>
          </div>
          <label className="admin-search">
            <span className="sr-only">Search businesses</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or owner"
            />
          </label>
        </div>
        {filteredBusinesses.length === 0 ? (
          <div className="admin-empty">No matching business accounts.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Owner</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Account control</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBusinesses.map((business) => (
                  <tr key={business.id}>
                    <td>
                      <strong>{business.name}</strong>
                      <small>{business.currency} workspace</small>
                    </td>
                    <td>
                      {business.ownerName}
                      <small>{business.ownerEmail}</small>
                    </td>
                    <td>{new Date(business.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`admin-status ${business.status}`}>
                        {business.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`admin-control ${business.status === "active" ? "suspend" : "activate"}`}
                        type="button"
                        onClick={() => toggleStatus(business)}
                      >
                        {business.status === "active"
                          ? "Suspend"
                          : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <footer className="admin-footer">
        <span>Stockora · Platform operations</span>
        <Link href="/login">Return to sign in</Link>
      </footer>
    </main>
  );
}
