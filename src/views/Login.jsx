import React, { useState } from "react";
import { Card, Input, Button, Alert, Avatar } from "impact-ui";
import { useAuth } from "../context/AuthContext.jsx";
import { USERS } from "../config/users.js";
import iaLogo from "../assets/impact-analytics-logo.png";
import "./Login.css";

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
    setTimeout(() => {
      const result = login(email, password);
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
      }
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
        <div className="login-brand-orb login-brand-orb-1" aria-hidden="true" />
        <div className="login-brand-orb login-brand-orb-2" aria-hidden="true" />

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
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <Card
            size="large"
            sx={{
              borderRadius: "20px",
              boxShadow: "0 8px 48px rgba(37,99,235,0.12), 0 2px 8px rgba(37,99,235,0.07)",
              border: "1px solid rgba(37,99,235,0.08)",
              overflow: "hidden",
            }}
          >
            <div className="login-card-inner">

              <div className="login-ia-hero">
                <img src={iaLogo} alt="Impact Analytics" className="login-ia-hero-logo" />
                <span className="login-ia-hero-rule" aria-hidden="true" />
              </div>

              <div className="login-welcome">
                <h1 className="login-title">Welcome back</h1>
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isDisabled={loading}
                  isRequired
                />

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  loading={loading}
                >
                  {loading ? "Signing in…" : "Sign in →"}
                </Button>
              </form>

              <div className="login-demo">
                <div className="login-demo-cards">
                  {USERS.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="login-demo-card"
                      onClick={() => fillDemo(u)}
                      disabled={loading}
                    >
                      <div className="login-demo-avatar-wrap" style={{ "--user-color": u.color }}>
                        <Avatar
                          size="medium"
                          type="initials"
                          label={u.avatar}
                        />
                      </div>
                      <div className="login-demo-info">
                        <div className="login-demo-name">{u.name}</div>
                        <div className="login-demo-role">{u.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="login-footer" />

            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}
