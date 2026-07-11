"use client";

import { useMemo, useState } from "react";
import { computeStatus } from "@/types/firestore";
import { toCsv, downloadCsv } from "@/lib/utils/csv";
import type { RankedIntern } from "./AllInternsExportCard";

const HEADERS = ["Rank", "Name", "Email", "Department", "Score", "Status"];

export default function LeaderboardExportCard({ interns }: { interns: RankedIntern[] }) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [top10Only, setTop10Only] = useState(false);

  const departments = useMemo(
    () => Array.from(new Set(interns.map((i) => i.department))).sort(),
    [interns]
  );

  const filtered = useMemo(() => {
    return interns
      .filter((i) => (top10Only ? i.rank <= 10 : true))
      .filter((i) => (department ? i.department === department : true))
      .filter((i) =>
        search.trim() === ""
          ? true
          : i.fullName.toLowerCase().includes(search.trim().toLowerCase())
      );
  }, [interns, search, department, top10Only]);

  function handleExport() {
    const csv = toCsv(
      HEADERS,
      filtered.map((i) => [
        i.rank,
        i.fullName,
        i.email,
        i.department,
        i.score,
        computeStatus(i.score),
      ])
    );
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`intern-scoreboard-leaderboard-${date}.csv`, csv);
  }

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h6 fw-bold mb-1">Leaderboard Rankings</h2>
        <p className="text-muted-2 small mb-3">
          Ranked export matching the public leaderboard&apos;s filters.
        </p>

        <div className="row g-2 mb-3 align-items-center">
          <div className="col-12 col-md-5">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-8 col-md-4">
            <select
              className="form-select form-select-sm"
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

          <div className="col-4 col-md-3 d-flex align-items-center">
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="reportTop10Toggle"
                checked={top10Only}
                onChange={(e) => setTop10Only(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="reportTop10Toggle">
                Top 10 only
              </label>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <span className="text-muted-2 small">
            Exporting {filtered.length} of {interns.length} interns
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
