import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api.js";
import type { MeetingBrief } from "../../lib/api.js";
import { ScoreCircle } from "../../components/ScoreCircle.js";
import { SignalItem } from "../../components/SignalItem.js";
import { colors, borderRadius, shadows, spacing, typography } from "../../lib/theme.js";
import { formatDate } from "../../lib/format.js";

export default function MeetingPrepScreen(): React.JSX.Element {
  const { leadId } = useLocalSearchParams<{ leadId: string }>();
  const [brief, setBrief] = useState<MeetingBrief | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBrief(): Promise<void> {
      try {
        const data = await api.get<MeetingBrief>(`/leads/${leadId}/meeting-brief`);
        setBrief(data);
      } catch {
        // TODO: error handling
      } finally {
        setIsLoading(false);
      }
    }
    void fetchBrief();
  }, [leadId]);

  async function handleShare(): Promise<void> {
    if (!brief) return;

    const text = [
      `Meeting Brief: ${brief.leadName}`,
      `Company: ${brief.company}`,
      `Score: ${brief.score}`,
      `Prepared: ${formatDate(brief.preparedAt)}`,
      "",
      "TALKING POINTS",
      ...brief.talkingPoints.map((tp, i) => `${i + 1}. ${tp}`),
      "",
      "RAPPORT HOOKS",
      ...brief.rapportHooks.map((h) => `- ${h}`),
    ].join("\n");

    try {
      await Share.share({
        title: `Meeting Brief - ${brief.leadName}`,
        message: text,
      });
    } catch {
      Alert.alert("Error", "Failed to share meeting brief");
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.amber[500]} />
      </View>
    );
  }

  if (!brief) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Meeting brief not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <ScoreCircle score={brief.score} size={56} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{brief.leadName}</Text>
          <Text style={styles.company}>{brief.company}</Text>
          <Text style={styles.prepDate}>
            Prepared {formatDate(brief.preparedAt)}
          </Text>
        </View>
      </View>

      {/* Share Button */}
      <Pressable style={styles.shareButton} onPress={() => void handleShare()}>
        <Ionicons name="share-outline" size={20} color={colors.navy[500]} />
        <Text style={styles.shareButtonText}>Share as PDF</Text>
      </Pressable>

      {/* Talking Points */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Talking Points</Text>
        <View style={styles.card}>
          {brief.talkingPoints.map((point, index) => (
            <View key={index} style={styles.talkingPointRow}>
              <View style={styles.talkingPointNumber}>
                <Text style={styles.talkingPointNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.talkingPointText}>{point}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Rapport Hooks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rapport Hooks</Text>
        <View style={styles.card}>
          {brief.rapportHooks.map((hook, index) => (
            <View key={index} style={styles.hookRow}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.amber[600]} />
              <Text style={styles.hookText}>{hook}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Enrichment Data */}
      {Object.keys(brief.enrichmentData).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enrichment Data</Text>
          <View style={styles.card}>
            {Object.entries(brief.enrichmentData).map(([key, value]) => (
              <View key={key} style={styles.enrichmentRow}>
                <Text style={styles.enrichmentLabel}>{key}</Text>
                <Text style={styles.enrichmentValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recent Signals */}
      {brief.recentSignals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Signals</Text>
          {brief.recentSignals.map((signal) => (
            <SignalItem key={signal.id} signal={signal} />
          ))}
        </View>
      )}
    </ScrollView>
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
    marginBottom: spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    ...typography.heading2,
    color: colors.navy[500],
  },
  company: {
    ...typography.body,
    fontWeight: "500",
    color: colors.navy[400],
    marginTop: 2,
  },
  prepDate: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.amber[500],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  shareButtonText: {
    ...typography.body,
    fontWeight: "600",
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
  talkingPointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  talkingPointNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.navy[400],
    justifyContent: "center",
    alignItems: "center",
  },
  talkingPointNumberText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.white,
  },
  talkingPointText: {
    ...typography.body,
    color: colors.navy[500],
    flex: 1,
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
  enrichmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  enrichmentLabel: {
    ...typography.bodySmall,
    color: colors.gray[600],
  },
  enrichmentValue: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.navy[500],
  },
});
