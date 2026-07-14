import type { LeaderboardEntry } from "@/types/firestore";
import StatusBadge from "@/components/shared/StatusBadge";

export default function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="card">
      <div className="table-responsive">
        <table className="table table-clean leaderboard-table mb-0">
          <thead>
            <tr>
              <th scope="col" style={{ width: 72 }}>Rank</th>
              <th scope="col">Name</th>
              <th scope="col">Department</th>
              <th scope="col">Score</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <span className="leaderboard-table-rank">#{entry.rank}</span>
                </td>
                <td className="fw-medium">{entry.fullName}</td>
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
  );
}
