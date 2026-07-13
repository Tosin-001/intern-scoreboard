"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { InternRecord } from "@/lib/actions/interns";
import type { ScoreHistoryEntry } from "@/lib/actions/scores";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { IconInterns, IconSearch } from "@/components/shared/icons";
import ScoreHistoryRow from "@/components/history/ScoreHistoryRow";

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
  const [internSearch, setInternSearch] = useState("");

  // Client-side only — filters the interns list already loaded via
  // loadData() below. No new Firestore reads for typing in this box.
  const visibleInterns = useMemo(() => {
    const term = internSearch.trim().toLowerCase();
    if (!term) return interns;
    return interns.filter((i) => i.fullName.toLowerCase().includes(term));
  }, [interns, internSearch]);

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
      visibleInterns.every((i) => prev.has(i.id))
        ? new Set(Array.from(prev).filter((id) => !visibleInterns.some((i) => i.id === id)))
        : new Set([...prev, ...visibleInterns.map((i) => i.id)])
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
        <h1 className="page-title">Score Management</h1>
        <p className="page-subtitle">
          Adjust scores directly, without editing full intern records.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <Spinner label="Loading scores…" />}

      {!loading && interns.length > 0 && (
        <div className="card card-toolbar mb-3">
          <div className="card-body py-2">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search by intern name…"
              value={internSearch}
              onChange={(e) => setInternSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {!loading && interns.length > 0 && (
        <div className="card card-toolbar mb-3">
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
        <EmptyState icon={<IconInterns size={26} />} title="No interns yet" description="Add interns first, then adjust scores here." />
      )}

      {!loading && interns.length > 0 && visibleInterns.length === 0 && (
        <EmptyState icon={<IconSearch size={26} />} title="No matching interns" description="Try a different search term." />
      )}

      {!loading && visibleInterns.length > 0 && (
        <div className="row g-3">
          <div className="col-12 col-lg-8">
            {/* Desktop/tablet: table. Hidden below md — see card list below. */}
            <div className="card d-none d-md-block">
              <div className="table-responsive">
                <table className="table table-clean mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={visibleInterns.length > 0 && visibleInterns.every((i) => selected.has(i.id))}
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
                    {visibleInterns.map((intern) => (
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

            {/* Mobile: stacked cards instead of a cramped table. Quick-adjust
                buttons are full touch-target size (44px+) in a 2x2 grid,
                not squeezed into a table cell. */}
            <div className="d-md-none d-flex flex-column gap-2">
              {visibleInterns.map((intern) => (
                <div className="card" key={intern.id}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          checked={selected.has(intern.id)}
                          onChange={() => toggleSelect(intern.id)}
                          aria-label={`Select ${intern.fullName}`}
                        />
                        <div>
                          <div className="fw-medium">{intern.fullName}</div>
                          <div className="text-muted-2 small">{intern.department}</div>
                        </div>
                      </div>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center"
                        style={{ width: 70 }}
                        defaultValue={intern.score}
                        key={intern.score}
                        min={0}
                        max={100}
                        disabled={savingId === intern.id}
                        onBlur={(e) => setExactScore(intern, e.target.value)}
                        aria-label={`Score for ${intern.fullName}`}
                      />
                    </div>
                    <div className="row g-2">
                      <div className="col-3">
                        <button
                          className="btn btn-outline-secondary w-100"
                          style={{ minHeight: 44 }}
                          disabled={savingId === intern.id}
                          onClick={() => adjustScore(intern, -5)}
                        >
                          −5
                        </button>
                      </div>
                      <div className="col-3">
                        <button
                          className="btn btn-outline-secondary w-100"
                          style={{ minHeight: 44 }}
                          disabled={savingId === intern.id}
                          onClick={() => adjustScore(intern, -1)}
                        >
                          −1
                        </button>
                      </div>
                      <div className="col-3">
                        <button
                          className="btn btn-outline-secondary w-100"
                          style={{ minHeight: 44 }}
                          disabled={savingId === intern.id}
                          onClick={() => adjustScore(intern, 1)}
                        >
                          +1
                        </button>
                      </div>
                      <div className="col-3">
                        <button
                          className="btn btn-outline-secondary w-100"
                          style={{ minHeight: 44 }}
                          disabled={savingId === intern.id}
                          onClick={() => adjustScore(intern, 5)}
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="section-title mb-0">Recent Score Changes</h2>
                  <a href="/history" className="small">
                    View All History →
                  </a>
                </div>
                {history.length === 0 && (
                  <p className="text-muted-2 small mb-0">No score changes yet.</p>
                )}
                <div className="d-flex flex-column gap-3">
                  {history.map((entry) => (
                    <ScoreHistoryRow key={entry.id} entry={entry} variant="compact" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
