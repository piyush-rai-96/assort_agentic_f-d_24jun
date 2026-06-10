import React, { useState } from "react";
import { Card, Input, Button, Alert } from "impact-ui";
import { useAuth } from "../context/AuthContext.jsx";
import { USERS } from "../config/users.js";
import "./Login.css";

/*
 * Login — two-panel layout matching the legacy fd-assortment-v4-2.html login
 * screen (dark-green branded left panel + white form right panel).
 *
 * Uses Impact UI Card / Input / Button / Alert primitives.
 * On successful auth the AuthContext user state updates, causing App to
 * unmount this view and render the main shell at the user's landing module.
 */
export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    // Simulate async auth delay matching legacy 800ms transition.
    setTimeout(() => {
      const result = login(email, password);
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
      }
      // On success the parent App re-renders automatically; no setState needed.
    }, 600);
  };

  const fillDemo = (user) => {
    setEmail(user.email);
    setPassword(user.password);
    setError(null);
  };

  return (
    <div className="login-shell">
      {/* ── Left brand panel ── */}
      <div className="login-brand">
        <div className="login-brand-grid" aria-hidden="true" />

        <div className="login-brand-top">
          <div className="login-logo-mark">FD</div>
          <div className="login-logo-label">
            <span className="login-logo-name">Floor &amp; Decor</span>
            <span className="login-logo-sub">Assortment Planning</span>
          </div>
        </div>

        <div className="login-brand-body">
          <div className="login-brand-headline">
            Agentic Assortment<br />Planning Suite
          </div>
          <div className="login-brand-sub">Fall / Winter 2025</div>
          <div className="login-brand-pills">
            <span className="login-pill">300 stores</span>
            <span className="login-pill">1,507 SKUs</span>
            <span className="login-pill">84% agent confidence</span>
          </div>
        </div>

        {/* Workflow progress strip — mirrors legacy donut/stepper */}
        <div className="login-steps">
          {[
            { n: 1, lbl: "Catalogue lock", done: true },
            { n: 2, lbl: "Core selection", done: true },
            { n: 3, lbl: "Location clustering", done: true },
            { n: 4, lbl: "Agent recommendations", done: true },
            { n: 5, lbl: "Store curation", active: true },
            { n: 6, lbl: "Final approval", done: false },
          ].map((s) => (
            <div
              key={s.n}
              className={`login-step ${s.done ? "done" : ""} ${s.active ? "active" : ""}`}
            >
              <div className="login-step-dot">
                {s.done ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span>{s.n}</span>
                )}
              </div>
              <span className="login-step-lbl">{s.lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-welcome">
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to your assortment workspace</p>
          </div>

          {error && (
            <div className="login-alert-wrap">
              <Alert
                severity="error"
                title={error}
                subtleBackground
                onClose={() => setError(null)}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <Input
              id="login-email"
              name="email"
              label="Email"
              placeholder="name@flooranddecor.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isDisabled={loading}
              isRequired
            />

            <Input
              id="login-password"
              name="password"
              label="Password"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isDisabled={loading}
              isRequired
            />

            <Button
              type="submit"
              variant="primary"
              isDisabled={loading}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div className="login-demo">
            <div className="login-demo-label">Demo accounts</div>
            <div className="login-demo-cards">
              {USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="login-demo-card"
                  onClick={() => fillDemo(u)}
                  disabled={loading}
                  style={{ "--user-color": u.color }}
                >
                  <div className="login-demo-avatar" style={{ background: u.color }}>
                    {u.avatar}
                  </div>
                  <div className="login-demo-info">
                    <div className="login-demo-name">{u.name}</div>
                    <div className="login-demo-role">{u.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="login-footer">
            <span className="login-tls">🔒 Secured with TLS 1.3</span>
            <span className="login-version">FW 2025 · v4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
