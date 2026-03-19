import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api.js";
import type { Lead, TimelineEvent } from "../../lib/api.js";
import { ScoreCircle } from "../../components/ScoreCircle.js";
import { Timeline } from "../../components/Timeline.js";
import { colors, borderRadius, shadows, spacing, typography } from "../../lib/theme.js";
import { formatMoney, formatDate, formatScore } from "../../lib/format.js";

export default function LeadDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [enrichment, setEnrichment] = useState<Record<string, string>>({});
  const [rapportHooks, setRapportHooks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLead(): Promise<void> {
      try {
        const [leadData, timelineData, enrichmentData] = await Promise.all([
          api.get<Lead>(`/leads/${id}`),
          api.get<TimelineEvent[]>(`/leads/${id}/timeline`),
          api.get<{ enrichment: Record<string, string>; rapportHooks: string[] }>(
            `/leads/${id}/enrichment`,
          ),
        ]);
        setLead(leadData);
        setEvents(timelineData);
        setEnrichment(enrichmentData.enrichment);
        setRapportHooks(enrichmentData.rapportHooks);
      } catch {
        // TODO: error handling
      } finally {
        setIsLoading(false);
      }
    }
    void fetchLead();
  }, [id]);

  const handleCall = useCallback(() => {
    if (!lead?.phone) return;
    void Linking.openURL(`tel:${lead.phone}`);
  }, [lead]);

  const handleEmail = useCallback(() => {
    if (!lead?.email) return;
    void Linking.openURL(`mailto:${lead.email}`);
  }, [lead]);

  const handlePrepMeeting = useCallback(() => {
    if (!id) return;
    router.push(`/meeting-prep/${id}`);
  }, [id, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.amber[500]} />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Lead not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <ScoreCircle score={lead.score} size={72} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{lead.name}</Text>
          <Text style={styles.title}>{lead.title}</Text>
          <Text style={styles.company}>{lead.company}</Text>
          <Text style={styles.scoreLabel}>{formatScore(lead.score)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color={colors.white} />
          <Text style={styles.actionText}>Call</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleEmail}>
          <Ionicons name="mail-outline" size={20} color={colors.white} />
          <Text style={styles.actionText}>Email</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.actionButtonAccent]}
          onPress={handlePrepMeeting}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.navy[500]} />
          <Text style={[styles.actionText, styles.actionTextAccent]}>Prep Meeting</Text>
        </Pressable>
      </View>

      {/* Details Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.card}>
          <DetailRow label="Signal Type" value={lead.signalType} />
          <DetailRow label="Pipeline Value" value={formatMoney(lead.pipelineValueCents)} />
          <DetailRow label="Territory" value={lead.territory} />
          <DetailRow label="Last Activity" value={formatDate(lead.lastActivityAt)} />
          <DetailRow label="Created" value={formatDate(lead.createdAt)} isLast />
        </View>
      </View>

      {/* Enrichment Data */}
      {Object.keys(enrichment).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enrichment</Text>
          <View style={styles.card}>
            {Object.entries(enrichment).map(([key, value], index, arr) => (
              <DetailRow
                key={key}
                label={key}
                value={value}
                isLast={index === arr.length - 1}
              />
            ))}
          </View>
        </View>
      )}

      {/* Rapport Hooks */}
      {rapportHooks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rapport Hooks</Text>
          <View style={styles.card}>
            {rapportHooks.map((hook, index) => (
              <View key={index} style={styles.hookRow}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.amber[600]} />
                <Text style={styles.hookText}>{hook}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Timeline</Text>
        <Timeline events={events} />
      </View>
    </ScrollView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

function DetailRow({ label, value, isLast }: DetailRowProps): React.JSX.Element {
  return (
    <>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[50],
  },
  errorText: {
    ...typography.body,
    color: colors.red[500],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    ...typography.heading2,
    color: colors.navy[500],
  },
  title: {
    ...typography.bodySmall,
    color: colors.gray[600],
    marginTop: 2,
  },
  company: {
    ...typography.body,
    fontWeight: "500",
    color: colors.navy[400],
    marginTop: 2,
  },
  scoreLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.amber[600],
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.navy[400],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  actionButtonAccent: {
    backgroundColor: colors.amber[500],
  },
  actionText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.white,
  },
  actionTextAccent: {
    color: colors.navy[500],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.gray[600],
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.gray[600],
  },
  detailValue: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.navy[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.xs,
  },
  hookRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  hookText: {
    ...typography.bodySmall,
    color: colors.navy[500],
    flex: 1,
  },
});
