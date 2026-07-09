import { redirect } from "next/navigation";
import { AggregateField } from "firebase-admin/firestore";
import { verifySession } from "@/lib/firebase/session";
import { adminDb } from "@/lib/firebase/admin";
import StatCard from "@/components/dashboard/StatCard";

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const activeInterns = adminDb.collection("interns").where("isDeleted", "==", false);

  const [countSnap, avgSnap, highestSnap, lowestSnap] = await Promise.all([
    activeInterns.count().get(),
    activeInterns.aggregate({ avgScore: AggregateField.average("score") }).get(),
    activeInterns.orderBy("score", "desc").limit(1).get(),
    activeInterns.orderBy("score", "asc").limit(1).get(),
  ]);

  const totalInterns = countSnap.data().count;
  const averageScore = Math.round(((avgSnap.data().avgScore as number) || 0) * 10) / 10;
  const highestScore = highestSnap.empty ? "—" : highestSnap.docs[0].data().score;
  const lowestScore = lowestSnap.empty ? "—" : lowestSnap.docs[0].data().score;

  return (
    <main className="container-fluid py-4 px-4">
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1">Dashboard</h1>
        <p className="text-muted-2 mb-0">Welcome back, {session.email}</p>
      </div>

      <div className="row g-3 mb-4">
        <StatCard label="Total Interns" value={totalInterns} icon="👥" />
        <StatCard label="Average Score" value={averageScore} icon="📊" tone="success" />
        <StatCard label="Highest Score" value={highestScore} icon="🏆" tone="warning" />
        <StatCard label="Lowest Score" value={lowestScore} icon="📉" tone="danger" />
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h6 fw-bold mb-2">Quick actions</h2>
          <p className="text-muted-2 small mb-3">
            Manage interns, update scores, and review rankings.
          </p>
          <a href="/interns" className="btn btn-primary btn-sm">
            Manage Interns →
          </a>
        </div>
      </div>
    </main>
  );
}
