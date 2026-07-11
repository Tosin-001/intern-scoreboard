"use client";

import { useMemo, useState } from "react";
import { computeStatus } from "@/types/firestore";
import { toCsv, downloadCsv } from "@/lib/utils/csv";

export interface RankedIntern {
  id: string;
  fullName: string;
  email: string;
  department: string;
  score: number;
  rank: number;
}

const HEADERS = ["Rank", "Name", "Email", "Department", "Score", "Status"];

export default function AllInternsExportCard({ interns }: { interns: RankedIntern[] }) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");

  const departments = useMemo(
    () => Array.from(new Set(interns.map((i) => i.department))).sort(),
    [interns]
  );

  const filtered = useMemo(() => {
    return interns
      .filter((i) => (department ? i.department === department : true))
      .filter((i) =>
        search.trim() === ""
          ? true
          : i.fullName.toLowerCase().includes(search.trim().toLowerCase()) ||
            i.department.toLowerCase().includes(search.trim().toLowerCase())
      );
  }, [interns, search, department]);

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
    downloadCsv(`intern-scoreboard-all-interns-${date}.csv`, csv);
  }

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h6 fw-bold mb-1">All Interns</h2>
        <p className="text-muted-2 small mb-3">
          Full intern roster, respecting the search and department filters below.
        </p>

        <div className="row g-2 mb-3">
          <div className="col-12 col-md-7">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search by name or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-5">
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
