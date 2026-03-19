import { describe, it, expect, vi, beforeEach } from "vitest";
import { OutreachDispatcher } from "../dispatcher.js";
import type { OutreachProvider, SendResult, DeliveryStatus } from "../types.js";

function makeProvider(overrides: Partial<OutreachProvider> = {}): OutreachProvider {
  return {
    name: overrides.name ?? "test-provider",
    channel: overrides.channel ?? "email",
    send: overrides.send ?? vi.fn(async () => ({ success: true, externalId: "ext-1", error: null })),
    checkStatus: overrides.checkStatus,
  };
}

describe("OutreachDispatcher", () => {
  let dispatcher: OutreachDispatcher;

  beforeEach(() => {
    dispatcher = new OutreachDispatcher();
  });

  const baseSendParams = {
    channel: "email",
    recipientEmail: "test@example.com",
    body: "<p>Hello</p>",
    fromName: "Agent Smith",
    metadata: { campaignId: "c1" },
  };

  it("registers a provider and sends through it", async () => {
    const sendFn = vi.fn(async (): Promise<SendResult> => ({
      success: true,
      externalId: "msg-123",
      error: null,
      costCents: 0,
    }));
    const provider = makeProvider({ send: sendFn });

    dispatcher.registerProvider("email", provider);
    const result = await dispatcher.send(baseSendParams);

    expect(result.success).toBe(true);
    expect(result.externalId).toBe("msg-123");
    expect(sendFn).toHaveBeenCalledTimes(1);
    expect(sendFn).toHaveBeenCalledWith(baseSendParams);
  });

  it("returns an error when no provider is registered for the channel", async () => {
    const result = await dispatcher.send({ ...baseSendParams, channel: "carrier-pigeon" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No provider registered for channel: carrier-pigeon");
    expect(result.externalId).toBeNull();
  });

  it("catches provider errors gracefully and returns an error result", async () => {
    const provider = makeProvider({
      send: vi.fn(async () => {
        throw new Error("connection timeout");
      }),
    });
    dispatcher.registerProvider("email", provider);

    const result = await dispatcher.send(baseSendParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe("connection timeout");
    expect(result.externalId).toBeNull();
  });

  it("catches non-Error throws gracefully", async () => {
    const provider = makeProvider({
      send: vi.fn(async () => {
        throw "string error";
      }),
    });
    dispatcher.registerProvider("email", provider);

    const result = await dispatcher.send(baseSendParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe("string error");
  });

  it("delegates checkDeliveryStatus to the correct provider", async () => {
    const checkStatus = vi.fn(async (): Promise<DeliveryStatus> => ({
      status: "delivered",
      details: "Inbox",
    }));
    const provider = makeProvider({ checkStatus });
    dispatcher.registerProvider("email", provider);

    const status = await dispatcher.checkDeliveryStatus("email", "ext-42");

    expect(status.status).toBe("delivered");
    expect(status.details).toBe("Inbox");
    expect(checkStatus).toHaveBeenCalledWith("ext-42");
  });

  it("returns unknown status when provider has no checkStatus method", async () => {
    const provider = makeProvider();
    delete (provider as Record<string, unknown>).checkStatus;
    dispatcher.registerProvider("email", provider);

    const status = await dispatcher.checkDeliveryStatus("email", "ext-1");

    expect(status.status).toBe("unknown");
  });

  it("returns unknown status for an unregistered channel on checkDeliveryStatus", async () => {
    const status = await dispatcher.checkDeliveryStatus("fax", "ext-1");

    expect(status.status).toBe("unknown");
  });

  it("supports multiple providers for different channels", async () => {
    const emailSend = vi.fn(async (): Promise<SendResult> => ({
      success: true,
      externalId: "email-1",
      error: null,
    }));
    const smsSend = vi.fn(async (): Promise<SendResult> => ({
      success: true,
      externalId: "sms-1",
      error: null,
    }));

    dispatcher.registerProvider("email", makeProvider({ send: emailSend }));
    dispatcher.registerProvider("sms", makeProvider({ name: "sms-provider", channel: "sms", send: smsSend }));

    const emailResult = await dispatcher.send(baseSendParams);
    const smsResult = await dispatcher.send({
      ...baseSendParams,
      channel: "sms",
      recipientPhone: "+15551234567",
    });

    expect(emailResult.externalId).toBe("email-1");
    expect(smsResult.externalId).toBe("sms-1");
    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(smsSend).toHaveBeenCalledTimes(1);
  });
});
