import { redirect } from "next/navigation";
import { verifySession } from "@/lib/firebase/session";

export default async function ReportsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  return (
    <main className="container-fluid py-4 px-4">
      <h1 className="h3 fw-bold mb-1">Reports</h1>
      <p className="text-muted-2 mb-4">CSV, Excel, and PDF export.</p>
      <div className="card">
        <div className="card-body text-center py-5">
          <div className="fs-1 mb-3">📄</div>
          <h2 className="h6 fw-bold mb-1">Coming in Phase 8</h2>
          <p className="text-muted-2 small mb-0">
            Export functionality is planned but not yet built — see PROJECT_STATUS.md.
          </p>
        </div>
      </div>
    </main>
  );
}
