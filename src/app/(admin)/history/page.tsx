"use client";

import { useEffect, useState, useMemo } from "react";
import type { ScoreHistoryEntry } from "@/lib/actions/scores";
import { timeAgo, formatFullDateTime } from "@/lib/utils/time";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { IconHistory, IconSearch } from "@/components/shared/icons";
import DeltaBadge from "@/components/history/DeltaBadge";
import ScoreHistoryRow from "@/components/history/ScoreHistoryRow";

type Direction = "all" | "increase" | "decrease";

export default function HistoryPage() {
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [internFilter, setInternFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [direction, setDirection] = useState<Direction>("all");

  useEffect(() => {
    // Single fetch reusing the existing endpoint at its current max — no
    // new API route, no schema change. Filtering below is entirely
    // client-side over this one result set.
    fetch("/api/scores/history?limit=100")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load score history.");
        return res.json();
      })
      .then((body) => setHistory(body.history))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load score history."))
      .finally(() => setLoading(false));
  }, []);

  // Dropdown options derived from the fetched history itself — no second
  // API call to /api/interns needed just to populate a filter list.
  const internNames = useMemo(
    () => Array.from(new Set(history.map((h) => h.internName))).sort(),
    [history]
  );

  const filtered = useMemo(() => {
    return history.filter((entry) => {
      if (internFilter && entry.internName !== internFilter) return false;

      if (search.trim() && !entry.internName.toLowerCase().includes(search.trim().toLowerCase()))
        return false;

      if (direction === "increase" && entry.newScore <= entry.oldScore) return false;
      if (direction === "decrease" && entry.newScore >= entry.oldScore) return false;

      if (entry.updatedAt) {
        const entryDate = entry.updatedAt.slice(0, 10); // YYYY-MM-DD
        if (fromDate && entryDate < fromDate) return false;
        if (toDate && entryDate > toDate) return false;
      }

      return true;
    });
  }, [history, search, internFilter, direction, fromDate, toDate]);

  return (
    <main className="container-fluid py-4 px-4">
      <div className="mb-4">
        <h1 className="page-title">Score History</h1>
        <p className="page-subtitle">
          Every score change, most recent first (last 100 entries).
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <Spinner label="Loading history…" />}

      {!loading && history.length > 0 && (
        <div className="card card-toolbar mb-3">
          <div className="card-body">
            <div className="row g-2 mb-2">
              <div className="col-12 col-md-6">
                <input
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Search by intern name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-12 col-sm-6 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={internFilter}
                  onChange={(e) => setInternFilter(e.target.value)}
                >
                  <option value="">All interns</option>
                  {internNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-sm-6 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as Direction)}
                >
                  <option value="all">All changes</option>
                  <option value="increase">Increases only</option>
                  <option value="decrease">Decreases only</option>
                </select>
              </div>
            </div>

            <div className="row g-2 align-items-center">
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">From</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">To</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6 text-md-end mt-2 mt-md-0">
                <span className="text-muted-2 small">
                  Showing {filtered.length} of {history.length} changes
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && history.length === 0 && (
        <EmptyState
          icon={<IconHistory size={26} />}
          title="No score changes yet"
          description="Score history will appear here once scores are updated."
        />
      )}

      {!loading && history.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={<IconSearch size={26} />}
          title="No matching entries"
          description="Try a different search, intern, date range, or direction."
        />
      )}

      {!loading && filtered.length > 0 && (
        <>
          {/* Desktop/tablet: table */}
          <div className="card d-none d-md-block">
            <div className="table-responsive">
              <table className="table table-clean mb-0">
                <thead>
                  <tr>
                    <th>Intern</th>
                    <th>Old → New</th>
                    <th>Delta</th>
                    <th>Updated By</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id}>
                      <td className="fw-medium">{entry.internName}</td>
                      <td>
                        {entry.oldScore} → {entry.newScore}
                      </td>
                      <td>
                        <DeltaBadge oldScore={entry.oldScore} newScore={entry.newScore} />
                      </td>
                      <td className="text-muted-2">{entry.updatedBy ? "Admin" : "—"}</td>
                      <td className="text-muted-2">
                        <div>{timeAgo(entry.updatedAt)}</div>
                        <div style={{ fontSize: "0.75rem" }}>
                          {formatFullDateTime(entry.updatedAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: cards, reusing the same row component as the Scores
              page's Recent Score Changes panel. */}
          <div className="d-md-none d-flex flex-column gap-2">
            {filtered.map((entry) => (
              <ScoreHistoryRow key={entry.id} entry={entry} variant="card" />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
