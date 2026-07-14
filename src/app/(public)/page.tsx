"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { computeStatus, type LeaderboardEntry } from "@/types/firestore";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { IconFlag, IconSearch } from "@/components/shared/icons";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";

const RANK_COLORS: Record<number, { solid: string; subtle: string }> = {
  1: { solid: "var(--brand-gold)", subtle: "var(--brand-gold-subtle)" },
  2: { solid: "var(--brand-silver)", subtle: "var(--brand-silver-subtle)" },
  3: { solid: "var(--brand-bronze)", subtle: "var(--brand-bronze-subtle)" },
};

export default function PublicLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [top10Only, setTop10Only] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "interns"),
      where("isDeleted", "==", false),
      orderBy("score", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ranked: LeaderboardEntry[] = snapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            fullName: data.fullName,
            email: data.email,
            department: data.department,
            score: data.score,
            rank: index + 1,
            status: computeStatus(data.score),
          } satisfies LeaderboardEntry;
        });
        setEntries(ranked);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Couldn't load the leaderboard. Please try again shortly.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // All derived client-side from `entries`, already loaded via the
  // onSnapshot listener above — no additional Firestore reads for any of
  // search, department filter, or the Top 10 toggle.
  const departments = useMemo(
    () => Array.from(new Set(entries.map((e) => e.department))).sort(),
    [entries]
  );

  const isFiltering = search.trim() !== "" || department !== "" || top10Only;

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (top10Only && e.rank > 10) return false;
      if (department && e.department !== department) return false;
      if (search.trim() && !e.fullName.toLowerCase().includes(search.trim().toLowerCase()))
        return false;
      return true;
    });
  }, [entries, search, department, top10Only]);

  // Podium only makes sense for the unfiltered, full board — once a search
  // or filter is active, show a plain filtered table instead (still using
  // each intern's true overall rank, not a re-numbered position).
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  // Hero stat values — all derived from `entries`/`departments`, already
  // computed above from the single onSnapshot listener. No new queries.
  const totalInterns = entries.length;
  const topScore = entries[0]?.score ?? 0;
  const departmentCount = departments.length;

  return (
    <main style={{ background: "var(--brand-bg)", minHeight: "100vh" }}>
      <div className="leaderboard-hero">
        <div className="leaderboard-hero-dots" />
        <div className="leaderboard-hero-accent" />
        <div className="container py-4 leaderboard-hero-content">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
            <div>
              <h1 className="page-title mb-0">Intern Leaderboard</h1>
              <p className="page-subtitle small">Live rankings, updated in real time</p>
            </div>
            <a href="/login" className="btn btn-outline-secondary btn-sm">
              Admin login
            </a>
          </div>

          {!loading && !error && entries.length > 0 && (
            <div className="row g-2">
              <div className="col-4">
                <div className="leaderboard-hero-stat">
                  <div className="leaderboard-hero-stat-value">{totalInterns}</div>
                  <div className="leaderboard-hero-stat-label">Total Interns</div>
                </div>
              </div>
              <div className="col-4">
                <div className="leaderboard-hero-stat">
                  <div className="leaderboard-hero-stat-value">{topScore}</div>
                  <div className="leaderboard-hero-stat-label">Top Score</div>
                </div>
              </div>
              <div className="col-4">
                <div className="leaderboard-hero-stat">
                  <div className="leaderboard-hero-stat-value">{departmentCount}</div>
                  <div className="leaderboard-hero-stat-label">Departments</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container py-4">
        {loading && <Spinner label="Loading rankings…" />}
        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <EmptyState
            icon={<IconFlag size={26} />}
            title="No interns on the board yet"
            description="Rankings will appear here once interns are added."
          />
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="leaderboard-toolbar mb-4">
            <div className="p-3">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-5">
                  <div className="leaderboard-toolbar-search-wrap">
                    <span className="leaderboard-toolbar-search-icon">
                      <IconSearch size={16} />
                    </span>
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search by name…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <select
                    className="form-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="">All departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="leaderboard-toolbar-toggle">
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="top10Toggle"
                        checked={top10Only}
                        onChange={(e) => setTop10Only(e.target.checked)}
                      />
                      <label className="form-check-label small" htmlFor="top10Toggle">
                        Top 10 only
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !isFiltering && podium.length > 0 && (
          <div className="row g-3 mb-4">
            {[podium[1], podium[0], podium[2]].map((entry, i) =>
              entry ? (
                <div className="col-12 col-sm-4" key={entry.id}>
                  <div
                    className={`podium-card card text-center p-4 h-100 podium-card--rank-${entry.rank}`}
                    style={{ marginTop: i === 1 ? 0 : undefined }}
                  >
                    <div className="d-none d-sm-block" style={{ height: i === 1 ? 0 : 24 }} />
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold mx-auto mb-3"
                      style={{
                        width: entry.rank === 1 ? 48 : 40,
                        height: entry.rank === 1 ? 48 : 40,
                        fontSize: entry.rank === 1 ? "1.25rem" : "1.05rem",
                        backgroundColor: RANK_COLORS[entry.rank]?.solid,
                        color: "#ffffff",
                        boxShadow: entry.rank === 1 ? "0 4px 10px rgba(245, 158, 11, 0.35)" : "none",
                      }}
                    >
                      {entry.rank}
                    </div>
                    <div className="fw-bold text-truncate mb-1">{entry.fullName}</div>
                    <div className="text-muted-2 small mb-3">{entry.department}</div>
                    <div className="fs-3 fw-bold mb-2" style={{ color: "var(--brand-primary)" }}>
                      {entry.score}
                    </div>
                    <StatusBadge status={entry.status} />
                  </div>
                </div>
              ) : (
                <div className="col-12 col-sm-4" key={`empty-${i}`} />
              )
            )}
          </div>
        )}

        {!loading && !error && !isFiltering && rest.length > 0 && (
          <LeaderboardTable entries={rest} />
        )}

        {!loading && !error && isFiltering && filteredEntries.length === 0 && (
          <EmptyState
            icon={<IconSearch size={26} />}
            title="No matching interns"
            description="Try a different search term or filter."
          />
        )}

        {!loading && !error && isFiltering && filteredEntries.length > 0 && (
          <LeaderboardTable entries={filteredEntries} />
        )}
      </div>
    </main>
  );
}
