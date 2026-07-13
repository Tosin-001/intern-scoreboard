import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { computeStatus, type Status } from "@/types/firestore";
import StatCard from "@/components/dashboard/StatCard";
import TopPerformersChart from "@/components/dashboard/TopPerformersChart";
import ScoreDistributionChart from "@/components/dashboard/ScoreDistributionChart";

const STATUS_ORDER: Status[] = ["Excellent", "Good", "Average", "Needs Improvement"];

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  // Single query powers the stat cards AND both charts below — replaces
  // the previous 4 separate aggregate queries. The charts need per-document
  // data regardless, so fetching once and deriving everything in JS avoids
  // paying for aggregate queries on top of a full fetch. See Phase 6 notes
  // in CHANGELOG.md.
  const snap = await adminDb
    .collection("interns")
    .where("isDeleted", "==", false)
    .orderBy("score", "desc")
    .get();

  const scores = snap.docs.map((doc) => ({
    name: doc.data().fullName as string,
    score: doc.data().score as number,
  }));

  const totalInterns = scores.length;
  const averageScore =
    totalInterns === 0
      ? 0
      : Math.round((scores.reduce((sum, s) => sum + s.score, 0) / totalInterns) * 10) / 10;
  const highestScore = scores[0]?.score ?? "—";
  const lowestScore = scores[scores.length - 1]?.score ?? "—";

  const topPerformers = scores.slice(0, 5).map((s) => ({
    name: s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name,
    score: s.score,
  }));

  const distribution = STATUS_ORDER.map((status) => ({
    status,
    count: scores.filter((s) => computeStatus(s.score) === status).length,
  }));

  return (
    <main className="container-fluid py-4 px-4">
      <div className="mb-4">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {session.email}</p>
      </div>

      <div className="row g-3 mb-4">
        <StatCard label="Total Interns" value={totalInterns} icon="👥" />
        <StatCard label="Average Score" value={averageScore} icon="📊" tone="success" />
        <StatCard label="Highest Score" value={highestScore} icon="🏆" tone="warning" />
        <StatCard label="Lowest Score" value={lowestScore} icon="📉" tone="danger" />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="section-title mb-3">Top Performers</h2>
              <TopPerformersChart data={topPerformers} />
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="section-title mb-3">Score Distribution</h2>
              <ScoreDistributionChart data={distribution} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="section-title mb-2">Quick actions</h2>
          <p className="text-muted-2 small mb-3">
            Manage interns, update scores, and review rankings.
          </p>
          <a href="/interns" className="btn btn-primary btn-sm me-2">
            Manage Interns →
          </a>
          <a href="/scores" className="btn btn-outline-primary btn-sm">
            Manage Scores →
          </a>
        </div>
      </div>
    </main>
  );
}
