"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface TopPerformerDatum {
  name: string;
  score: number;
}

export default function TopPerformersChart({ data }: { data: TopPerformerDatum[] }) {
  if (data.length === 0) {
    return <p className="text-muted-2 small mb-0">No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "#6b7280" }} />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 12, fill: "#111827" }}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          cursor={{ fill: "#f3f4f6" }}
        />
        <Bar dataKey="score" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
