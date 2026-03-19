import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius, shadows, spacing, typography } from "../lib/theme.js";

interface KpiCardProps {
  label: string;
  value: string;
  trend: number;
}

export function KpiCard({ label, value, trend }: KpiCardProps): React.JSX.Element {
  const isPositive = trend >= 0;
  const trendColor = isPositive ? colors.green[500] : colors.red[500];
  const trendIcon = isPositive ? "trending-up" : "trending-down";
  const trendText = `${isPositive ? "+" : ""}${trend.toFixed(1)}%`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.trendRow}>
        <Ionicons name={trendIcon} size={14} color={trendColor} />
        <Text style={[styles.trendText, { color: trendColor }]}>{trendText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: "45%" as unknown as number,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  label: {
    ...typography.caption,
    color: colors.gray[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.heading2,
    color: colors.navy[500],
    marginBottom: spacing.xs,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  trendText: {
    ...typography.caption,
    fontWeight: "600",
  },
});
