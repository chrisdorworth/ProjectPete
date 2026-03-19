import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius, spacing, typography } from "../lib/theme.js";
import { formatRelativeTime } from "../lib/format.js";
import type { TimelineEvent } from "../lib/api.js";

interface TimelineProps {
  events: TimelineEvent[];
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const EVENT_CONFIG: Record<
  string,
  { icon: IoniconsName; color: string }
> = {
  call: { icon: "call-outline", color: colors.green[500] },
  email: { icon: "mail-outline", color: colors.blue[500] },
  meeting: { icon: "calendar-outline", color: colors.amber[600] },
  signal: { icon: "pulse-outline", color: colors.red[400] },
  note: { icon: "create-outline", color: colors.gray[600] },
  status_change: { icon: "swap-horizontal-outline", color: colors.navy[400] },
};

export function Timeline({ events }: TimelineProps): React.JSX.Element {
  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No activity yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((event, index) => {
        const config = EVENT_CONFIG[event.type] ?? {
          icon: "ellipse-outline" as IoniconsName,
          color: colors.gray[500],
        };
        const isLast = index === events.length - 1;

        return (
          <View key={event.id} style={styles.eventRow}>
            {/* Left column: icon + line */}
            <View style={styles.iconColumn}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${config.color}18` },
                ]}
              >
                <Ionicons name={config.icon} size={16} color={config.color} />
              </View>
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Right column: content */}
            <View style={[styles.eventContent, isLast && styles.eventContentLast]}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventTime}>
                  {formatRelativeTime(event.createdAt)}
                </Text>
              </View>
              {event.description ? (
                <Text style={styles.eventDescription}>{event.description}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  emptyContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    color: colors.gray[500],
  },
  eventRow: {
    flexDirection: "row",
  },
  iconColumn: {
    alignItems: "center",
    width: 36,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.xs,
  },
  eventContent: {
    flex: 1,
    marginLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  eventContentLast: {
    paddingBottom: 0,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  eventTitle: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.navy[500],
    flex: 1,
  },
  eventTime: {
    ...typography.caption,
    color: colors.gray[400],
    marginLeft: spacing.sm,
  },
  eventDescription: {
    ...typography.bodySmall,
    color: colors.gray[600],
  },
});
