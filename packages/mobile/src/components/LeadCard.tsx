import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScoreCircle } from "./ScoreCircle.js";
import { colors, borderRadius, shadows, spacing, typography } from "../lib/theme.js";
import { formatMoneyCompact, formatRelativeTime } from "../lib/format.js";
import type { Lead } from "../lib/api.js";

interface LeadCardProps {
  lead: Lead;
}

const SIGNAL_BADGE_COLORS: Record<string, string> = {
  job_change: colors.blue[500],
  funding: colors.green[500],
  expansion: colors.amber[600],
  intent: colors.red[400],
  engagement: colors.navy[400],
};

export function LeadCard({ lead }: LeadCardProps): React.JSX.Element {
  const router = useRouter();

  function handlePress(): void {
    router.push(`/lead/${lead.id}`);
  }

  const badgeColor = SIGNAL_BADGE_COLORS[lead.signalType] ?? colors.gray[500];

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <ScoreCircle score={lead.score} size={48} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {lead.name}
        </Text>
        <Text style={styles.company} numberOfLines={1}>
          {lead.company}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.signalBadge, { backgroundColor: `${badgeColor}20` }]}>
            <Text style={[styles.signalBadgeText, { color: badgeColor }]}>
              {lead.signalType.replace(/_/g, " ")}
            </Text>
          </View>
          <Text style={styles.lastActivity}>
            {formatRelativeTime(lead.lastActivityAt)}
          </Text>
        </View>
      </View>
      <View style={styles.valueColumn}>
        <Text style={styles.value}>
          {formatMoneyCompact(lead.pipelineValueCents)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: "600",
    color: colors.navy[500],
  },
  company: {
    ...typography.bodySmall,
    color: colors.gray[600],
    marginTop: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  signalBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  signalBadgeText: {
    ...typography.caption,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  lastActivity: {
    ...typography.caption,
    color: colors.gray[400],
  },
  valueColumn: {
    alignItems: "flex-end",
  },
  value: {
    ...typography.body,
    fontWeight: "700",
    color: colors.navy[500],
  },
});
