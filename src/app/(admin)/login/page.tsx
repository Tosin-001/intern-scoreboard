"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Not authorized as an admin.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="d-flex align-items-center justify-content-center px-3"
      style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f8fb 0%,#eef0ff 100%)" }}
    >
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div className="text-center mb-4">
          <div className="fs-3 fw-bold" style={{ color: "var(--brand-primary)" }}>
            Intern Scoreboard
          </div>
          <p className="text-muted-2 small mb-0">Admin access only</p>
        </div>

        <div className="card p-4">
          <h1 className="h5 fw-bold mb-1">Welcome back</h1>
          <p className="text-muted-2 small mb-4">Sign in to manage interns and scores.</p>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label small fw-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="form-label small fw-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted-2 small mt-3 mb-0">
          <a href="/" className="text-muted-2">← Back to leaderboard</a>
        </p>
      </div>
    </main>
  );
}
