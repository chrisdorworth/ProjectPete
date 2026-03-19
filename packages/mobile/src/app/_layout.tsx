import React from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { AuthProvider } from "../lib/auth.js";
import { colors } from "../lib/theme.js";

export default function RootLayout(): React.JSX.Element {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.navy[500],
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontWeight: "600",
          },
          contentStyle: {
            backgroundColor: colors.gray[50],
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="lead/[id]"
          options={{
            title: "Lead Details",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="meeting-prep/[leadId]"
          options={{
            title: "Meeting Prep",
            headerBackTitle: "Back",
            presentation: "modal",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
