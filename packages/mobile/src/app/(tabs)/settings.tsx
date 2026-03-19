import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api.js";
import type { UserProfile } from "../../lib/api.js";
import { useAuth } from "../../lib/auth.js";
import { colors, borderRadius, shadows, spacing, typography } from "../../lib/theme.js";

export default function SettingsScreen(): React.JSX.Element {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile(): Promise<void> {
      try {
        const data = await api.get<UserProfile>("/user/profile");
        setProfile(data);
      } catch {
        // TODO: error handling
      } finally {
        setIsLoading(false);
      }
    }
    void fetchProfile();
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => void logout(),
      },
    ]);
  }, [logout]);

  const togglePreference = useCallback(
    async (key: keyof UserProfile["notificationPreferences"], value: boolean) => {
      if (!profile) return;
      const updated = {
        ...profile,
        notificationPreferences: {
          ...profile.notificationPreferences,
          [key]: value,
        },
      };
      setProfile(updated);
      try {
        await api.patch("/user/profile", {
          notificationPreferences: updated.notificationPreferences,
        });
      } catch {
        setProfile(profile);
      }
    },
    [profile],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.amber[500]} />
      </View>
    );
  }

  const prefs = profile?.notificationPreferences;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color={colors.white} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name ?? "---"}</Text>
              <Text style={styles.profileEmail}>{profile?.email ?? "---"}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Territory Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Territory</Text>
        <Pressable style={styles.card}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Current Territory</Text>
              <Text style={styles.settingValue}>{profile?.territory ?? "Not set"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </View>
        </Pressable>
      </View>

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={prefs?.pushEnabled ?? false}
              onValueChange={(v) => void togglePreference("pushEnabled", v)}
              trackColor={{ false: colors.gray[300], true: colors.amber[300] }}
              thumbColor={prefs?.pushEnabled ? colors.amber[500] : colors.gray[100]}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <Text style={styles.settingLabel}>Email Notifications</Text>
            <Switch
              value={prefs?.emailEnabled ?? false}
              onValueChange={(v) => void togglePreference("emailEnabled", v)}
              trackColor={{ false: colors.gray[300], true: colors.amber[300] }}
              thumbColor={prefs?.emailEnabled ? colors.amber[500] : colors.gray[100]}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <Text style={styles.settingLabel}>T1 Signal Alerts</Text>
            <Switch
              value={prefs?.t1Signals ?? false}
              onValueChange={(v) => void togglePreference("t1Signals", v)}
              trackColor={{ false: colors.gray[300], true: colors.amber[300] }}
              thumbColor={prefs?.t1Signals ? colors.amber[500] : colors.gray[100]}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <Text style={styles.settingLabel}>T2 Signal Alerts</Text>
            <Switch
              value={prefs?.t2Signals ?? false}
              onValueChange={(v) => void togglePreference("t2Signals", v)}
              trackColor={{ false: colors.gray[300], true: colors.amber[300] }}
              thumbColor={prefs?.t2Signals ? colors.amber[500] : colors.gray[100]}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <Text style={styles.settingLabel}>T3 Signal Alerts</Text>
            <Switch
              value={prefs?.t3Signals ?? false}
              onValueChange={(v) => void togglePreference("t3Signals", v)}
              trackColor={{ false: colors.gray[300], true: colors.amber[300] }}
              thumbColor={prefs?.t3Signals ? colors.amber[500] : colors.gray[100]}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <Text style={styles.settingLabel}>Meeting Reminders</Text>
            <Switch
              value={prefs?.meetingReminders ?? false}
              onValueChange={(v) => void togglePreference("meetingReminders", v)}
              trackColor={{ false: colors.gray[300], true: colors.amber[300] }}
              thumbColor={prefs?.meetingReminders ? colors.amber[500] : colors.gray[100]}
            />
          </View>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.red[500]} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
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
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navy[400],
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.heading3,
    color: colors.navy[500],
  },
  profileEmail: {
    ...typography.bodySmall,
    color: colors.gray[600],
    marginTop: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLabel: {
    ...typography.body,
    color: colors.navy[500],
  },
  settingValue: {
    ...typography.bodySmall,
    color: colors.gray[600],
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.sm,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.red[400],
  },
  logoutText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.red[500],
  },
});
