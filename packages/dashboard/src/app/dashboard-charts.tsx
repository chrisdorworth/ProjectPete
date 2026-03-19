"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const recentSignals = [
  { day: "Mon", count: 12 },
  { day: "Tue", count: 19 },
  { day: "Wed", count: 8 },
  { day: "Thu", count: 24 },
  { day: "Fri", count: 16 },
  { day: "Sat", count: 5 },
  { day: "Sun", count: 3 },
];

const scoreDistribution = [
  { name: "Low (0-25)", value: 42, color: "#ef4444" },
  { name: "Medium (26-50)", value: 78, color: "#f59e0b" },
  { name: "High (51-75)", value: 56, color: "#10b981" },
  { name: "Hot (76-100)", value: 31, color: "#3b82f6" },
];

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface-raised p-5">
        <h3 className="mb-4 text-sm font-medium text-text-muted">
          Recent Signals (This Week)
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={recentSignals}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f9fafb",
              }}
            />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-surface-raised p-5">
        <h3 className="mb-4 text-sm font-medium text-text-muted">
          Lead Score Distribution
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={scoreDistribution}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
            >
              {scoreDistribution.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f9fafb",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          {scoreDistribution.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-text-muted">
                {entry.name} ({entry.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
