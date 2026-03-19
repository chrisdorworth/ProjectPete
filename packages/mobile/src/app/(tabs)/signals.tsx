import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../lib/api.js";
import type { Signal } from "../../lib/api.js";
import { SignalItem } from "../../components/SignalItem.js";
import { colors, borderRadius, spacing, typography } from "../../lib/theme.js";

type TierFilter = "ALL" | "T1" | "T2" | "T3";

const TIER_OPTIONS: TierFilter[] = ["ALL", "T1", "T2", "T3"];

export default function SignalsScreen(): React.JSX.Element {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activeTier, setActiveTier] = useState<TierFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSignals = useCallback(async () => {
    try {
      const data = await api.get<Signal[]>("/signals");
      setSignals(data);
    } catch {
      // TODO: error handling
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSignals();
  }, [fetchSignals]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchSignals();
  }, [fetchSignals]);

  const filteredSignals =
    activeTier === "ALL"
      ? signals
      : signals.filter((s) => s.tier === activeTier);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.amber[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {TIER_OPTIONS.map((tier) => (
          <Pressable
            key={tier}
            style={[
              styles.filterChip,
              activeTier === tier && styles.filterChipActive,
            ]}
            onPress={() => setActiveTier(tier)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeTier === tier && styles.filterChipTextActive,
              ]}
            >
              {tier}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.amber[500]}
          />
        }
        data={filteredSignals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SignalItem signal={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No signals for this tier</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[50],
  },
  filterBar: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  filterChipActive: {
    backgroundColor: colors.amber[500],
  },
  filterChipText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.gray[600],
  },
  filterChipTextActive: {
    color: colors.navy[500],
  },
  listContent: {
    padding: spacing.lg,
  },
  separator: {
    height: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
