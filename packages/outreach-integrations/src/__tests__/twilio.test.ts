import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TwilioSmsProvider } from "../providers/twilio/client.js";

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
}

describe("TwilioSmsProvider", () => {
  let provider: TwilioSmsProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    provider = new TwilioSmsProvider("AC_test_sid", "test_auth_token", "+15550001111");
  });

  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
  });

  const baseSendParams = {
    recipientPhone: "+15559876543",
    body: "Hi there! Your advisor has an update. Reply STOP to opt out",
    metadata: { campaignId: "c1" },
  };

  it("sends an SMS successfully", async () => {
    const fetchMock = mockFetchResponse({ sid: "SM_abc123", price: "-0.0075" });
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.send(baseSendParams);

    expect(result.success).toBe(true);
    expect(result.externalId).toBe("SM_abc123");
    expect(result.error).toBeNull();
    expect(result.costCents).toBe(1); // Math.abs(Math.round(-0.0075 * 100)) = 1

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/Accounts/AC_test_sid/Messages.json");
    expect(options.method).toBe("POST");
    expect(options.headers).toHaveProperty("Content-Type", "application/x-www-form-urlencoded");
  });

  it("appends STOP opt-out text when missing from body", async () => {
    const fetchMock = mockFetchResponse({ sid: "SM_opt", price: null });
    vi.stubGlobal("fetch", fetchMock);

    await provider.send({
      ...baseSendParams,
      body: "Hi there! Your advisor has an update.",
    });

    const bodyParams = new URLSearchParams(fetchMock.mock.calls[0]![1]!.body as string);
    expect(bodyParams.get("Body")).toContain("Reply STOP to opt out");
  });

  it("does not duplicate STOP when already present", async () => {
    const fetchMock = mockFetchResponse({ sid: "SM_dup", price: null });
    vi.stubGlobal("fetch", fetchMock);

    await provider.send(baseSendParams);

    const bodyParams = new URLSearchParams(fetchMock.mock.calls[0]![1]!.body as string);
    const bodyText = bodyParams.get("Body")!;
    // Only one occurrence of STOP
    expect(bodyText.match(/STOP/g)!.length).toBe(1);
  });

  it("rejects messages that exceed the 1600 character limit", async () => {
    const fetchMock = mockFetchResponse({});
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.send({
      ...baseSendParams,
      body: "x".repeat(1601),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("1600 character limit");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("formats a 10-digit phone number with +1 prefix", async () => {
    const fetchMock = mockFetchResponse({ sid: "SM_format", price: null });
    vi.stubGlobal("fetch", fetchMock);

    await provider.send({
      ...baseSendParams,
      recipientPhone: "(555) 987-6543",
    });

    const bodyParams = new URLSearchParams(fetchMock.mock.calls[0]![1]!.body as string);
    expect(bodyParams.get("To")).toBe("+15559876543");
  });

  it("returns an error when recipient phone is missing", async () => {
    const fetchMock = mockFetchResponse({});
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.send({
      ...baseSendParams,
      recipientPhone: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No recipient phone number");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles Twilio API errors", async () => {
    const fetchMock = mockFetchResponse("Unauthorized", false, 401);
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.send(baseSendParams);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Twilio error: 401");
  });

  it("defaults costCents to 1 when price is null", async () => {
    const fetchMock = mockFetchResponse({ sid: "SM_free", price: null });
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.send(baseSendParams);

    expect(result.costCents).toBe(1);
  });

  it("checkStatus maps 'delivered' correctly", async () => {
    const fetchMock = mockFetchResponse({ status: "delivered" });
    vi.stubGlobal("fetch", fetchMock);

    const status = await provider.checkStatus("SM_123");

    expect(status.status).toBe("delivered");
  });

  it("checkStatus maps 'failed' correctly", async () => {
    const fetchMock = mockFetchResponse({ status: "failed" });
    vi.stubGlobal("fetch", fetchMock);

    const status = await provider.checkStatus("SM_fail");

    expect(status.status).toBe("failed");
  });

  it("checkStatus returns 'unknown' on API failure", async () => {
    const fetchMock = mockFetchResponse({}, false, 500);
    vi.stubGlobal("fetch", fetchMock);

    const status = await provider.checkStatus("SM_bad");

    expect(status.status).toBe("unknown");
  });
});
