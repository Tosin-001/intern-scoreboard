"use client";

import { useEffect, useState } from "react";
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

export default function PublicLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <main style={{ background: "var(--brand-bg)", minHeight: "100vh" }}>
      <div className="border-bottom bg-white">
        <div className="container py-4 d-flex justify-content-between align-items-center">
          <div>
            <h1 className="h4 fw-bold mb-0">Intern Leaderboard</h1>
            <p className="text-muted-2 small mb-0">Live rankings, updated in real time</p>
          </div>
          <a href="/login" className="btn btn-outline-secondary btn-sm">
            Admin login
          </a>
        </div>
      </div>

      <div className="container py-4">
        {loading && <Spinner label="Loading rankings…" />}
        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <EmptyState
            icon="🏁"
            title="No interns on the board yet"
            description="Rankings will appear here once interns are added."
          />
        )}

        {!loading && !error && podium.length > 0 && (
          <div className="row g-3 mb-4">
            {[podium[1], podium[0], podium[2]].map((entry, i) =>
              entry ? (
                <div className="col-4" key={entry.id}>
                  <div
                    className="podium-card card text-center p-3 h-100"
                    style={{ marginTop: i === 1 ? 0 : 24 }}
                  >
                    <div className="fs-2 mb-1">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                    </div>
                    <div className="fw-bold text-truncate">{entry.fullName}</div>
                    <div className="text-muted-2 small mb-2">{entry.department}</div>
                    <div className="fs-4 fw-bold" style={{ color: "var(--brand-primary)" }}>
                      {entry.score}
                    </div>
                    <div className="mt-2">
                      <StatusBadge status={entry.status} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="col-4" key={`empty-${i}`} />
              )
            )}
          </div>
        )}

        {!loading && !error && rest.length > 0 && (
          <div className="card">
            <div className="table-responsive">
              <table className="table table-clean mb-0">
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Name</th>
                    <th scope="col">Department</th>
                    <th scope="col">Score</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((entry) => (
                    <tr key={entry.id}>
                      <td className="fw-medium">#{entry.rank}</td>
                      <td>{entry.fullName}</td>
                      <td className="text-muted-2">{entry.department}</td>
                      <td className="fw-bold">{entry.score}</td>
                      <td>
                        <StatusBadge status={entry.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
