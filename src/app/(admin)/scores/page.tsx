"use client";

import { useEffect, useState, useCallback } from "react";
import type { InternRecord } from "@/lib/actions/interns";
import type { ScoreHistoryEntry } from "@/lib/actions/scores";
import { timeAgo } from "@/lib/utils/time";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function ScoresPage() {
  const [interns, setInterns] = useState<InternRecord[]>([]);
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<"delta" | "set">("delta");
  const [bulkValue, setBulkValue] = useState("5");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [internsRes, historyRes] = await Promise.all([
        fetch("/api/interns"),
        fetch("/api/scores/history?limit=15"),
      ]);
      if (!internsRes.ok || !historyRes.ok) throw new Error("Failed to load data.");
      const internsBody = await internsRes.json();
      const historyBody = await historyRes.json();
      setInterns(internsBody.interns.filter((i: InternRecord) => !i.isDeleted));
      setHistory(historyBody.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function adjustScore(intern: InternRecord, delta: number) {
    const newScore = clampScore(intern.score + delta);
    if (newScore === intern.score) return;
    setSavingId(intern.id);
    try {
      const res = await fetch(`/api/interns/${intern.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: newScore }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update score.");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update score.");
    } finally {
      setSavingId(null);
    }
  }

  async function setExactScore(intern: InternRecord, value: string) {
    const parsed = clampScore(Number(value));
    if (Number.isNaN(parsed) || parsed === intern.score) return;
    await adjustScore(intern, parsed - intern.score);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === interns.length ? new Set() : new Set(interns.map((i) => i.id))
    );
  }

  async function submitBulkUpdate() {
    if (selected.size === 0) return;
    setBulkSubmitting(true);
    setBulkMessage(null);
    setError(null);

    const value = Number(bulkValue);
    if (Number.isNaN(value)) {
      setError("Enter a valid number for the bulk update.");
      setBulkSubmitting(false);
      return;
    }

    const updates = Array.from(selected)
      .map((id) => interns.find((i) => i.id === id))
      .filter((i): i is InternRecord => !!i)
      .map((intern) => ({
        internId: intern.id,
        newScore: clampScore(bulkMode === "delta" ? intern.score + value : value),
      }));

    try {
      const res = await fetch("/api/scores/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const body = await res.json();
      if (!res.ok && res.status !== 207) {
        throw new Error(body.error ?? "Bulk update failed.");
      }
      setBulkMessage(`Updated ${body.succeeded} intern(s)${body.failed ? `, ${body.failed} failed` : ""}.`);
      setSelected(new Set());
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed.");
    } finally {
      setBulkSubmitting(false);
    }
  }

  return (
    <main className="container-fluid py-4 px-4">
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1">Score Management</h1>
        <p className="text-muted-2 mb-0">
          Adjust scores directly, without editing full intern records.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <Spinner label="Loading scores…" />}

      {!loading && interns.length > 0 && (
        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex flex-wrap align-items-end gap-2">
              <div>
                <label className="form-label small fw-medium mb-1">
                  Bulk update ({selected.size} selected)
                </label>
                <div className="d-flex flex-wrap gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: 140, flex: "1 1 140px" }}
                    value={bulkMode}
                    onChange={(e) => setBulkMode(e.target.value as "delta" | "set")}
                  >
                    <option value="delta">Add / Subtract</option>
                    <option value="set">Set to value</option>
                  </select>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ minWidth: 80, flex: "1 1 80px" }}
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={selected.size === 0 || bulkSubmitting}
                    onClick={submitBulkUpdate}
                  >
                    {bulkSubmitting ? "Applying…" : "Apply to Selected"}
                  </button>
                </div>
              </div>
              {bulkMessage && <span className="text-muted-2 small">{bulkMessage}</span>}
            </div>
          </div>
        </div>
      )}

      {!loading && interns.length === 0 && (
        <EmptyState icon="🧑‍💻" title="No interns yet" description="Add interns first, then adjust scores here." />
      )}

      {!loading && interns.length > 0 && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="card">
              <div className="table-responsive">
                <table className="table table-clean mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selected.size === interns.length && interns.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Score</th>
                      <th className="text-end">Quick Adjust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interns.map((intern) => (
                      <tr key={intern.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selected.has(intern.id)}
                            onChange={() => toggleSelect(intern.id)}
                          />
                        </td>
                        <td className="fw-medium">{intern.fullName}</td>
                        <td className="text-muted-2">{intern.department}</td>
                        <td style={{ width: 90 }}>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            defaultValue={intern.score}
                            key={intern.score}
                            min={0}
                            max={100}
                            disabled={savingId === intern.id}
                            onBlur={(e) => setExactScore(intern, e.target.value)}
                          />
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary"
                              disabled={savingId === intern.id}
                              onClick={() => adjustScore(intern, -5)}
                            >
                              −5
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              disabled={savingId === intern.id}
                              onClick={() => adjustScore(intern, -1)}
                            >
                              −1
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              disabled={savingId === intern.id}
                              onClick={() => adjustScore(intern, 1)}
                            >
                              +1
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              disabled={savingId === intern.id}
                              onClick={() => adjustScore(intern, 5)}
                            >
                              +5
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card">
              <div className="card-body">
                <h2 className="h6 fw-bold mb-3">Recent Score Changes</h2>
                {history.length === 0 && (
                  <p className="text-muted-2 small mb-0">No score changes yet.</p>
                )}
                <div className="d-flex flex-column gap-3">
                  {history.map((entry) => {
                    const increased = entry.newScore > entry.oldScore;
                    return (
                      <div key={entry.id} className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-medium small">{entry.internName}</div>
                          <div className="text-muted-2" style={{ fontSize: "0.75rem" }}>
                            {entry.oldScore} → {entry.newScore} · {timeAgo(entry.updatedAt)}
                          </div>
                        </div>
                        <span className={`badge ${increased ? "bg-success-subtle text-success-emphasis" : "bg-danger-subtle text-danger-emphasis"}`}>
                          {increased ? "+" : ""}{entry.newScore - entry.oldScore}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
