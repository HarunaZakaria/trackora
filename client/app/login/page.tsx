"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Logo from "../components/Logo";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, openDemoBusiness, openAdminPreview } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  function enterDemo() {
    openDemoBusiness();
    router.replace("/dashboard");
  }

  function enterAdminPreview() {
    openAdminPreview();
    router.replace("/admin");
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <div className="auth-aside-top">
          <Logo />
          <span>BUSINESS OPERATIONS</span>
        </div>
        <div className="auth-aside-copy">
          <span className="auth-kicker">A clearer view of your shop</span>
          <h1>Everything in its right place.</h1>
          <p>
            Inventory, sales, suppliers, and the details that keep business
            moving.
          </p>
        </div>
        <div className="auth-aside-bottom">
          <span>STOCKORA</span>
          <span>YOUR BUSINESS. UNDER CONTROL.</span>
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to Stockora</h2>
          <p className="auth-description">
            Use your business owner account to continue.
          </p>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email address</span>
              <input
                autoComplete="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@business.com"
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </label>
            <button
              className="btn primary auth-submit"
              disabled={busy}
              type="submit"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="auth-switch">
            New to Stockora?{" "}
            <Link href="/signup">Create a business account</Link>
          </p>
          <div className="auth-divider">
            <span>OR OPEN A PREVIEW</span>
          </div>
          <div className="auth-preview-actions">
            <button className="btn secondary" type="button" onClick={enterDemo}>
              Sample business
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={enterAdminPreview}
            >
              Platform admin
            </button>
          </div>
          <p className="auth-notice">
            Preview accounts and business data are stored in this browser only.
            This is not production authentication.
          </p>
        </div>
      </section>
    </main>
  );
}
