export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

export interface PushTarget {
  repId: string;
  expoPushToken?: string;
  apnsToken?: string;
  fcmToken?: string;
}

export class PushNotificationService {
  private expoUrl = "https://exp.host/--/api/v2/push/send";

  async sendToExpo(target: PushTarget, payload: PushPayload): Promise<{ success: boolean; error?: string }> {
    if (!target.expoPushToken) {
      return { success: false, error: "No Expo push token" };
    }

    const response = await fetch(this.expoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: target.expoPushToken,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        badge: payload.badge,
        sound: payload.sound ?? "default",
        priority: "high",
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Expo push error: ${response.status}` };
    }

    return { success: true };
  }

  buildHighScoreAlert(leadName: string, score: number, signalType: string, leadId: string): PushPayload {
    return {
      title: `High-Score Lead: ${score}`,
      body: `${leadName} — ${signalType}`,
      data: { screen: "lead-detail", leadId },
      sound: "default",
    };
  }

  buildMeetingReminder(leadName: string, meetingTime: string, leadId: string): PushPayload {
    return {
      title: `Meeting in 30min: ${leadName}`,
      body: `Tap to view meeting brief`,
      data: { screen: "meeting-prep", leadId },
      sound: "default",
    };
  }

  buildDigestReady(period: "daily" | "weekly"): PushPayload {
    return {
      title: `${period === "daily" ? "Daily" : "Weekly"} Digest Ready`,
      body: "Check your lead activity summary",
      data: { screen: "digest" },
    };
  }
}
