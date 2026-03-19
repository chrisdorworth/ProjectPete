import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius, shadows, spacing, typography } from "../lib/theme.js";
import { formatMoneyCompact, formatRelativeTime } from "../lib/format.js";
import type { Signal } from "../lib/api.js";

interface SignalItemProps {
  signal: Signal;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const SIGNAL_TYPE_ICONS: Record<string, IoniconsName> = {
  job_change: "briefcase-outline",
  funding: "cash-outline",
  expansion: "resize-outline",
  intent: "flame-outline",
  engagement: "chatbox-outline",
  news: "newspaper-outline",
  filing: "document-outline",
};

const TIER_COLORS: Record<string, string> = {
  T1: colors.red[500],
  T2: colors.amber[600],
  T3: colors.blue[500],
};

export function SignalItem({ signal }: SignalItemProps): React.JSX.Element {
  const router = useRouter();

  function handlePress(): void {
    router.push(`/lead/${signal.leadId}`);
  }

  const iconName = SIGNAL_TYPE_ICONS[signal.type] ?? ("alert-circle-outline" as IoniconsName);
  const tierColor = TIER_COLORS[signal.tier] ?? colors.gray[500];

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${tierColor}18` }]}>
        <Ionicons name={iconName} size={20} color={tierColor} />
      </View>
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.leadName} numberOfLines={1}>
            {signal.leadName}
          </Text>
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{signal.tier}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {signal.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.source}>{signal.source}</Text>
          <Text style={styles.dot}>{"\u00B7"}</Text>
          <Text style={styles.value}>
            {formatMoneyCompact(signal.valueCents)}
          </Text>
          <Text style={styles.dot}>{"\u00B7"}</Text>
          <Text style={styles.time}>
            {formatRelativeTime(signal.createdAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  leadName: {
    ...typography.body,
    fontWeight: "600",
    color: colors.navy[500],
    flex: 1,
    marginRight: spacing.sm,
  },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tierText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.white,
  },
  description: {
    ...typography.bodySmall,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  source: {
    ...typography.caption,
    color: colors.gray[500],
  },
  dot: {
    ...typography.caption,
    color: colors.gray[400],
  },
  value: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.navy[400],
  },
  time: {
    ...typography.caption,
    color: colors.gray[400],
  },
});
