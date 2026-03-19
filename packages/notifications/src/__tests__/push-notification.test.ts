import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PushNotificationService } from "../push-notification.js";
import type { PushTarget, PushPayload } from "../push-notification.js";

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
}

describe("PushNotificationService", () => {
  let service: PushNotificationService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    service = new PushNotificationService();
  });

  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
  });

  describe("buildHighScoreAlert", () => {
    it("returns the correct payload structure", () => {
      const payload = service.buildHighScoreAlert("Jane Doe", 95, "401k_rollover", "lead-1");

      expect(payload.title).toBe("High-Score Lead: 95");
      expect(payload.body).toBe("Jane Doe — 401k_rollover");
      expect(payload.data).toEqual({ screen: "lead-detail", leadId: "lead-1" });
      expect(payload.sound).toBe("default");
    });

    it("includes the score in the title", () => {
      const payload = service.buildHighScoreAlert("X", 42, "signal", "id");

      expect(payload.title).toContain("42");
    });
  });

  describe("buildMeetingReminder", () => {
    it("returns the correct payload structure", () => {
      const payload = service.buildMeetingReminder("Bob Chen", "2026-03-19T14:00:00Z", "lead-2");

      expect(payload.title).toBe("Meeting in 30min: Bob Chen");
      expect(payload.body).toBe("Tap to view meeting brief");
      expect(payload.data).toEqual({ screen: "meeting-prep", leadId: "lead-2" });
      expect(payload.sound).toBe("default");
    });
  });

  describe("buildDigestReady", () => {
    it("returns daily digest payload", () => {
      const payload = service.buildDigestReady("daily");

      expect(payload.title).toBe("Daily Digest Ready");
      expect(payload.body).toBe("Check your lead activity summary");
      expect(payload.data).toEqual({ screen: "digest" });
      expect(payload.sound).toBeUndefined();
    });

    it("returns weekly digest payload", () => {
      const payload = service.buildDigestReady("weekly");

      expect(payload.title).toBe("Weekly Digest Ready");
    });
  });

  describe("sendToExpo", () => {
    const validTarget: PushTarget = {
      repId: "rep-1",
      expoPushToken: "ExponentPushToken[abc123]",
    };

    const payload: PushPayload = {
      title: "Test",
      body: "Test body",
      data: { screen: "home" },
    };

    it("sends successfully with a valid Expo push token", async () => {
      const fetchMock = mockFetchResponse({ data: { status: "ok" } });
      vi.stubGlobal("fetch", fetchMock);

      const result = await service.sendToExpo(validTarget, payload);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://exp.host/--/api/v2/push/send");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body as string);
      expect(body.to).toBe("ExponentPushToken[abc123]");
      expect(body.title).toBe("Test");
      expect(body.body).toBe("Test body");
      expect(body.priority).toBe("high");
      expect(body.sound).toBe("default"); // default when not specified
    });

    it("returns an error when no Expo push token is present", async () => {
      const fetchMock = mockFetchResponse({});
      vi.stubGlobal("fetch", fetchMock);

      const result = await service.sendToExpo(
        { repId: "rep-1" },
        payload,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("No Expo push token");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns an error on API failure", async () => {
      const fetchMock = mockFetchResponse({}, false, 500);
      vi.stubGlobal("fetch", fetchMock);

      const result = await service.sendToExpo(validTarget, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Expo push error: 500");
    });

    it("uses custom sound when provided in payload", async () => {
      const fetchMock = mockFetchResponse({ data: { status: "ok" } });
      vi.stubGlobal("fetch", fetchMock);

      await service.sendToExpo(validTarget, { ...payload, sound: "custom.wav" });

      const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
      expect(body.sound).toBe("custom.wav");
    });

    it("includes badge count when provided", async () => {
      const fetchMock = mockFetchResponse({ data: { status: "ok" } });
      vi.stubGlobal("fetch", fetchMock);

      await service.sendToExpo(validTarget, { ...payload, badge: 5 });

      const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
      expect(body.badge).toBe(5);
    });
  });
});
