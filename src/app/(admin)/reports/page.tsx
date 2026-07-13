"use client";

import { useEffect, useState, useMemo } from "react";
import type { InternRecord } from "@/lib/actions/interns";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { IconReports } from "@/components/shared/icons";
import AllInternsExportCard, {
  type RankedIntern,
} from "@/components/reports/AllInternsExportCard";

export default function ReportsPage() {
  const [interns, setInterns] = useState<InternRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Single fetch, reused by both export cards below — no per-filter or
    // per-export Firestore reads, per the "no unnecessary reads" rule
    // carried through every prior phase.
    fetch("/api/interns")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load interns.");
        return res.json();
      })
      .then((body) => setInterns(body.interns))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load interns."))
      .finally(() => setLoading(false));
  }, []);

  // Ranked once here, shared by both cards below — rank always reflects
  // true overall standing among active interns, same rule Phase 7 uses.
  const rankedInterns: RankedIntern[] = useMemo(() => {
    return interns
      .filter((i) => !i.isDeleted)
      .sort((a, b) => b.score - a.score)
      .map((i, index) => ({
        id: i.id,
        fullName: i.fullName,
        email: i.email,
        department: i.department,
        score: i.score,
        rank: index + 1,
      }));
  }, [interns]);

  return (
    <main className="container-fluid py-4 px-4">
      <div className="mb-4">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Export intern data to CSV.</p>
      </div>

      {loading && <Spinner label="Loading data…" />}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && rankedInterns.length === 0 && (
        <EmptyState
          icon={<IconReports size={26} />}
          title="Nothing to export yet"
          description="Add interns first, then come back here to export reports."
        />
      )}

      {!loading && !error && rankedInterns.length > 0 && (
        <AllInternsExportCard interns={rankedInterns} />
      )}
    </main>
  );
}
