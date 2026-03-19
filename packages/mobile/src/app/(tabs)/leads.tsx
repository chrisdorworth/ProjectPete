import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { api } from "../../lib/api.js";
import type { Lead } from "../../lib/api.js";
import { LeadCard } from "../../components/LeadCard.js";
import { colors, borderRadius, spacing, typography } from "../../lib/theme.js";

export default function LeadsScreen(): React.JSX.Element {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const data = await api.get<Lead[]>("/leads");
      setLeads(data);
      setFilteredLeads(data);
    } catch {
      // TODO: error handling
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLeads(leads);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredLeads(
        leads.filter(
          (lead) =>
            lead.name.toLowerCase().includes(query) ||
            lead.company.toLowerCase().includes(query) ||
            lead.signalType.toLowerCase().includes(query),
        ),
      );
    }
  }, [searchQuery, leads]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchLeads();
  }, [fetchLeads]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.amber[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          placeholderTextColor={colors.gray[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
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
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LeadCard lead={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  searchContainer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  searchInput: {
    ...typography.body,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.navy[500],
  },
  listContent: {
    padding: spacing.lg,
  },
  separator: {
    height: spacing.md,
  },
});
