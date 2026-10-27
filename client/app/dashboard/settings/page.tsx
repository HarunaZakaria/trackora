"use client";

import { useState } from "react";
import { PageHeader } from "../../components/ui";
import { useStore } from "../../lib/store";

export default function Settings() {
  const {
    businessName,
    currency,
    preferences,
    setBusiness,
    setPreference,
    clearDemoData,
  } = useStore();
  const [name, setName] = useState(businessName);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [saved, setSaved] = useState(false);

  function saveBusiness() {
    if (!name.trim()) return;
    setBusiness(name.trim(), selectedCurrency);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Business preferences"
        description="Configure business details and the behavior of this local demo."
      />
      {saved && (
        <div className="success-banner" role="status">
          Business preferences saved.
        </div>
      )}
      <div className="settings-layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h4>Business details</h4>
              <p className="muted">Used across the dashboard and receipts.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field form-span">
              <span>Business name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Currency</span>
              <select
                value={selectedCurrency}
                onChange={(event) => setSelectedCurrency(event.target.value)}
              >
                <option value="GHS">Ghanaian Cedi (GHS)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="NGN">Nigerian Naira (NGN)</option>
                <option value="GBP">Pound Sterling (GBP)</option>
              </select>
            </label>
            <div className="field">
              <span>Data storage</span>
              <p className="setting-value">This browser only</p>
            </div>
          </div>
          <div className="modal-actions">
            <button
              className="btn primary"
              type="button"
              onClick={saveBusiness}
            >
              Save business details
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h4>Preferences</h4>
              <p className="muted">
                Changes are saved automatically in this browser.
              </p>
            </div>
          </div>
          <div className="settings-list">
            {(
              [
                [
                  "lowStockAlerts",
                  "Low stock alerts",
                  "Highlight products that fall at or below reorder level.",
                ],
                [
                  "receiptNumbering",
                  "Automatic receipt numbering",
                  "Assign a sequential receipt number to each sale.",
                ],
                [
                  "supplierReminders",
                  "Supplier reminders",
                  "Show reminders for supplier balances and pending orders.",
                ],
                [
                  "darkMode",
                  "Dark theme",
                  "Use a darker interface across the application.",
                ],
              ] as const
            ).map(([key, label, description]) => (
              <label className="setting-item setting-toggle" key={key}>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(event) => setPreference(key, event.target.checked)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="panel danger-panel">
          <div>
            <h4>Reset demo data</h4>
            <p className="muted">
              Restore the original sample records and discard changes saved in
              this browser.
            </p>
          </div>
          <button
            className="btn danger-button"
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Reset all local Stockora demo data? This cannot be undone.",
                )
              ) {
                clearDemoData();
                setName(businessName);
                setSelectedCurrency(currency);
                setSaved(true);
              }
            }}
          >
            Reset browser data
          </button>
        </section>
      </div>
    </>
  );
}
