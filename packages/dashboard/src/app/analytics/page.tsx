"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";
import { useAnalytics } from "@/lib/queries";
import { formatMoney, formatCompactNumber } from "@/lib/format";

const funnelColors = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"];

export default function AnalyticsPage() {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger-light">
        Failed to load analytics data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <p className="text-sm text-text-muted">
          Performance metrics and conversion insights
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="mb-4 text-sm font-medium text-text-muted">
            Conversion Funnel
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
              />
              <Funnel dataKey="count" data={data.conversionFunnel} isAnimationActive>
                <LabelList
                  position="right"
                  fill="#f9fafb"
                  stroke="none"
                  dataKey="stage"
                  fontSize={12}
                />
                {data.conversionFunnel.map((_, i) => (
                  <Cell key={i} fill={funnelColors[i % funnelColors.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Performance */}
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="mb-4 text-sm font-medium text-text-muted">
            Channel Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.channelPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="channel" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
              />
              <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversions" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Signal Source ROI */}
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="mb-4 text-sm font-medium text-text-muted">
            Signal Source ROI
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Cost</th>
                  <th className="pb-2 font-medium">Revenue</th>
                  <th className="pb-2 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {data.signalSourceROI.map((source) => (
                  <tr key={source.source} className="border-b border-border/50">
                    <td className="py-2.5 text-text-primary">{source.source}</td>
                    <td className="py-2.5 text-text-secondary">
                      {formatMoney(source.cost)}
                    </td>
                    <td className="py-2.5 text-text-secondary">
                      {formatMoney(source.revenue)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={
                          source.roi > 0 ? "text-success" : "text-danger"
                        }
                      >
                        {source.roi > 0 ? "+" : ""}
                        {source.roi.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Time to Contact */}
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="mb-4 text-sm font-medium text-text-muted">
            Time to Contact
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.timeToContact}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="bucket" stroke="#6b7280" fontSize={12} />
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
      </div>

      {/* Rep Leaderboard */}
      <div className="rounded-xl border border-border bg-surface-raised p-5">
        <h3 className="mb-4 text-sm font-medium text-text-muted">
          Rep Leaderboard
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-2 font-medium">Rank</th>
                <th className="pb-2 font-medium">Rep</th>
                <th className="pb-2 font-medium">Leads</th>
                <th className="pb-2 font-medium">Conversions</th>
                <th className="pb-2 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.repLeaderboard.map((rep, i) => (
                <tr key={rep.name} className="border-b border-border/50">
                  <td className="py-2.5">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-overlay text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2.5 font-medium text-text-primary">
                    {rep.name}
                  </td>
                  <td className="py-2.5 text-text-secondary">
                    {formatCompactNumber(rep.leads)}
                  </td>
                  <td className="py-2.5 text-text-secondary">
                    {formatCompactNumber(rep.conversions)}
                  </td>
                  <td className="py-2.5 font-medium text-success">
                    {formatMoney(rep.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
