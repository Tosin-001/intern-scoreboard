"use client";

import { useMemo, useState } from "react";
import { computeStatus } from "@/types/firestore";
import { toCsv, downloadCsv } from "@/lib/utils/csv";
import SelectableInternsTable from "./SelectableInternsTable";

export interface RankedIntern {
  id: string;
  fullName: string;
  email: string;
  department: string;
  score: number;
  rank: number;
}

const HEADERS = ["Rank", "Name", "Email", "Department", "Score", "Status"];

function rowsToCsv(rows: RankedIntern[]): string {
  return toCsv(
    HEADERS,
    rows.map((i) => [i.rank, i.fullName, i.email, i.department, i.score, computeStatus(i.score)])
  );
}

export default function AllInternsExportCard({ interns }: { interns: RankedIntern[] }) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Selection is scoped to whatever's currently filtered — rows selected
  // earlier that have since fallen out of the filter don't count toward
  // the visible selected count or get exported, per the plan.
  const selectedInFiltered = filtered.filter((i) => selectedIds.has(i.id));

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const allFilteredSelected = filtered.every((i) => selectedIds.has(i.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((i) => next.delete(i.id));
      } else {
        filtered.forEach((i) => next.add(i.id));
      }
      return next;
    });
  }

  function handleExportAll() {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`intern-scoreboard-all-interns-${date}.csv`, rowsToCsv(filtered));
  }

  function handleExportSelected() {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `intern-scoreboard-all-interns-selected-${date}.csv`,
      rowsToCsv(selectedInFiltered)
    );
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

        <SelectableInternsTable
          rows={filtered}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
          <span className="text-muted-2 small">
            Exporting {filtered.length} of {interns.length} interns
            {selectedInFiltered.length > 0 && ` · ${selectedInFiltered.length} selected`}
          </span>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={handleExportSelected}
              disabled={selectedInFiltered.length === 0}
            >
              Export Selected CSV
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleExportAll}
              disabled={filtered.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
