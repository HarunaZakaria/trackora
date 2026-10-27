"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Logo from "../components/Logo";
import { useAuth } from "../lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signUp({ name, businessName, email, password, currency });
      router.replace("/dashboard");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to create the account.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-aside signup-aside">
        <div className="auth-aside-top">
          <Logo />
          <span>ONE BUSINESS. ONE WORKSPACE.</span>
        </div>
        <div className="auth-aside-copy">
          <span className="auth-kicker">Your workspace starts here</span>
          <h1>Set up shop. Start organized.</h1>
          <p>Your business gets its own workspace and separate demo records.</p>
        </div>
        <div className="auth-aside-bottom">
          <span>STOCKORA</span>
          <span>YOUR BUSINESS. UNDER CONTROL.</span>
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-form-wrap auth-form-wrap-wide">
          <span className="eyebrow">GET STARTED</span>
          <h2>Create your business account</h2>
          <p className="auth-description">
            Register your business and owner profile.
          </p>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Business name</span>
              <input
                autoComplete="organization"
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="e.g. Northline Supply"
              />
            </label>
            <label className="field">
              <span>Owner name</span>
              <input
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
              />
            </label>
            <label className="field">
              <span>Business email</span>
              <input
                autoComplete="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@business.com"
              />
            </label>
            <div className="auth-fields-row">
              <label className="field">
                <span>Password</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>
              <label className="field">
                <span>Currency</span>
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  <option value="GHS">Ghanaian cedi · GHS</option>
                  <option value="USD">US dollar · USD</option>
                  <option value="NGN">Nigerian naira · NGN</option>
                  <option value="GBP">Pound sterling · GBP</option>
                </select>
              </label>
            </div>
            <button
              className="btn primary auth-submit"
              disabled={busy}
              type="submit"
            >
              {busy ? "Creating workspace…" : "Create business account"}
            </button>
          </form>
          <p className="auth-switch">
            Already registered? <Link href="/login">Sign in</Link>
          </p>
          <p className="auth-notice">
            This demo saves account details in local browser storage. Use a
            server-backed identity system before handling real business data.
          </p>
        </div>
      </section>
    </main>
  );
}
