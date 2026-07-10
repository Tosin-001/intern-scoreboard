"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export interface ScoreDistributionDatum {
  status: string;
  count: number;
}

const STATUS_COLORS: Record<string, string> = {
  Excellent: "#16a34a",
  Good: "#4f46e5",
  Average: "#d97706",
  "Needs Improvement": "#6b7280",
};

export default function ScoreDistributionChart({ data }: { data: ScoreDistributionDatum[] }) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return <p className="text-muted-2 small mb-0">No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#6b7280" }} interval={0} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          cursor={{ fill: "#f3f4f6" }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#4f46e5"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
