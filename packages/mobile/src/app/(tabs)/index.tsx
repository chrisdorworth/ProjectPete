import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../lib/api.js";
import type { DashboardKpis, Signal } from "../../lib/api.js";
import { KpiCard } from "../../components/KpiCard.js";
import { SignalItem } from "../../components/SignalItem.js";
import { colors, spacing, typography } from "../../lib/theme.js";
import { formatMoneyCompact } from "../../lib/format.js";

export default function DashboardScreen(): React.JSX.Element {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [kpiData, signalData] = await Promise.all([
        api.get<DashboardKpis>("/dashboard/kpis"),
        api.get<Signal[]>("/signals?limit=10"),
      ]);
      setKpis(kpiData);
      setRecentSignals(signalData);
    } catch {
      // TODO: error handling
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.amber[500]} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.amber[500]}
        />
      }
      ListHeaderComponent={
        <>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.kpiGrid}>
            <KpiCard
              label="New Leads"
              value={String(kpis?.newLeadsCount ?? 0)}
              trend={kpis?.newLeadsTrend ?? 0}
            />
            <KpiCard
              label="Meetings Today"
              value={String(kpis?.meetingsTodayCount ?? 0)}
              trend={kpis?.meetingsTodayTrend ?? 0}
            />
            <KpiCard
              label="Pipeline"
              value={formatMoneyCompact(kpis?.pipelineValueCents ?? 0)}
              trend={kpis?.pipelineValueTrend ?? 0}
            />
            <KpiCard
              label="Conversion"
              value={`${(kpis?.conversionRate ?? 0).toFixed(1)}%`}
              trend={kpis?.conversionRateTrend ?? 0}
            />
          </View>
          <Text style={styles.sectionTitle}>Recent Signals</Text>
        </>
      }
      data={recentSignals}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SignalItem signal={item} />}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No recent signals</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[50],
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.navy[500],
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
