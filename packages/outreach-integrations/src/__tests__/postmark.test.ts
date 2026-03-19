import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PostmarkProvider } from "../providers/postmark/client.js";

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
}

describe("PostmarkProvider", () => {
  let provider: PostmarkProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    provider = new PostmarkProvider("test-server-token");
  });

  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
  });

  const baseSendParams = {
    recipientEmail: "client@example.com",
    subject: "Portfolio Update",
    body: "<p>Your portfolio grew 5%</p>",
    fromName: "John Advisor",
    fromEmail: "john@advisory.com",
    metadata: { campaignId: "camp-1", leadId: "lead-1" },
  };

  it("sends an email successfully and returns the MessageID", async () => {
    const fetchMock = mockFetchResponse({ MessageID: "pm-msg-abc123" });
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.send(baseSendParams);

    expect(result.success).toBe(true);
    expect(result.externalId).toBe("pm-msg-abc123");
    expect(result.error).toBeNull();
    expect(result.costCents).toBe(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.postmarkapp.com/email");
    expect(options.method).toBe("POST");
    expect(options.headers).toHaveProperty("X-Postmark-Server-Token", "test-server-token");

    const body = JSON.parse(options.body as string);
    expect(body.To).toBe("client@example.com");
    expect(body.From).toContain("John Advisor");
    expect(body.Subject).toBe("Portfolio Update");
    expect(body.TrackOpens).toBe(true);
  });

  it("returns an error when recipient email is missing", async () => {
    const fetchMock = mockFetchResponse({});
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.send({
      ...baseSendParams,
      recipientEmail: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No recipient email");
    expect(result.externalId).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an error when recipient email is undefined", async () => {
    const fetchMock = mockFetchResponse({});
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.send({
      ...baseSendParams,
      recipientEmail: undefined,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No recipient email");
  });

  it("handles Postmark API errors", async () => {
    const fetchMock = mockFetchResponse("Invalid token", false, 401);
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.send(baseSendParams);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Postmark error: 401");
    expect(result.externalId).toBeNull();
  });

  it("uses default subject when none is provided", async () => {
    const fetchMock = mockFetchResponse({ MessageID: "pm-default-subj" });
    vi.stubGlobal("fetch", fetchMock);

    await provider.send({ ...baseSendParams, subject: undefined });

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.Subject).toBe("A message from your financial advisor");
  });

  it("checkStatus returns 'delivered' for Delivered status", async () => {
    const fetchMock = mockFetchResponse({ Status: "Delivered", Recipients: ["a@b.com"] });
    vi.stubGlobal("fetch", fetchMock);

    const status = await provider.checkStatus("msg-42");

    expect(status.status).toBe("delivered");
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/messages/outbound/msg-42/details");
  });

  it("checkStatus returns 'sent' for Processed status", async () => {
    const fetchMock = mockFetchResponse({ Status: "Processed", Recipients: [] });
    vi.stubGlobal("fetch", fetchMock);

    const status = await provider.checkStatus("msg-99");

    expect(status.status).toBe("sent");
  });

  it("checkStatus returns 'unknown' for API failure", async () => {
    const fetchMock = mockFetchResponse({}, false, 500);
    vi.stubGlobal("fetch", fetchMock);

    const status = await provider.checkStatus("msg-bad");

    expect(status.status).toBe("unknown");
  });

  it("checkStatus returns 'unknown' for unmapped status", async () => {
    const fetchMock = mockFetchResponse({ Status: "SomethingNew", Recipients: [] });
    vi.stubGlobal("fetch", fetchMock);

    const status = await provider.checkStatus("msg-new");

    expect(status.status).toBe("unknown");
  });
});
