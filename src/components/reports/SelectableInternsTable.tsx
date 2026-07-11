"use client";

import type { RankedIntern } from "./AllInternsExportCard";
import { computeStatus } from "@/types/firestore";
import StatusBadge from "@/components/shared/StatusBadge";

interface SelectableInternsTableProps {
  rows: RankedIntern[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
}

export default function SelectableInternsTable({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
}: SelectableInternsTableProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  if (rows.length === 0) {
    return <p className="text-muted-2 small mb-0">No matching interns.</p>;
  }

  return (
    <div className="table-responsive" style={{ maxHeight: 320, overflowY: "auto" }}>
      <table className="table table-clean table-sm mb-0">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <input
                type="checkbox"
                className="form-check-input"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all filtered rows"
              />
            </th>
            <th>Rank</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Score</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selectedIds.has(row.id)}
                  onChange={() => onToggleRow(row.id)}
                  aria-label={`Select ${row.fullName}`}
                />
              </td>
              <td className="fw-medium">#{row.rank}</td>
              <td>{row.fullName}</td>
              <td className="text-muted-2">{row.email}</td>
              <td>{row.department}</td>
              <td className="fw-bold">{row.score}</td>
              <td>
                <StatusBadge status={computeStatus(row.score)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
