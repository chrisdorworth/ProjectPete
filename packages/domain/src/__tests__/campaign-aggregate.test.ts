import { describe, it, expect } from "vitest";
import {
  createDefaultCampaign,
  getNextStep,
  advanceCampaign,
  cancelCampaign,
} from "../aggregates/campaign-aggregate.js";
import type { CampaignState } from "../aggregates/campaign-aggregate.js";

describe("CampaignAggregate", () => {
  describe("createDefaultCampaign - high-value signal types", () => {
    const highValueSignals = [
      "deed_transfer",
      "sec_form4",
      "business_dissolution",
      "probate_filing",
      "court_settlement",
      "news_liquidity_event",
    ];

    it.each(highValueSignals)(
      "creates a 5-step campaign for high-value signal: %s",
      (signalType) => {
        const campaign = createDefaultCampaign("lead-1", signalType);
        expect(campaign.leadId).toBe("lead-1");
        expect(campaign.steps).toHaveLength(5);
        expect(campaign.currentStep).toBe(0);
        expect(campaign.status).toBe("active");
        expect(campaign.lastStepAt).toBeNull();
      },
    );

    it("uses correct channels for high-value campaigns", () => {
      const campaign = createDefaultCampaign("lead-1", "deed_transfer");
      const channels = campaign.steps.map((s) => s.channel);
      expect(channels).toEqual(["email", "linkedin", "voicemail", "email", "handwritten"]);
    });

    it("uses correct delay progression for high-value campaigns", () => {
      const campaign = createDefaultCampaign("lead-1", "sec_form4");
      const delays = campaign.steps.map((s) => s.delayDays);
      expect(delays).toEqual([0, 2, 5, 10, 14]);
    });
  });

  describe("createDefaultCampaign - standard signal types", () => {
    it("creates a 4-step campaign for non-high-value signals", () => {
      const campaign = createDefaultCampaign("lead-2", "property_listing");
      expect(campaign.steps).toHaveLength(4);
      expect(campaign.status).toBe("active");
    });

    it("uses correct channels for standard campaigns", () => {
      const campaign = createDefaultCampaign("lead-2", "property_listing");
      const channels = campaign.steps.map((s) => s.channel);
      expect(channels).toEqual(["email", "linkedin", "email", "voicemail"]);
    });

    it("uses correct delay progression for standard campaigns", () => {
      const campaign = createDefaultCampaign("lead-2", "generic_signal");
      const delays = campaign.steps.map((s) => s.delayDays);
      expect(delays).toEqual([0, 3, 10, 17]);
    });
  });

  describe("getNextStep", () => {
    it("returns the first step when currentStep is 0", () => {
      const campaign = createDefaultCampaign("lead-1", "deed_transfer");
      const step = getNextStep(campaign);
      expect(step).not.toBeNull();
      expect(step!.order).toBe(1);
      expect(step!.channel).toBe("email");
      expect(step!.variant).toBe("rapport");
      expect(step!.delayDays).toBe(0);
      expect(step!.condition).toBe("always");
    });

    it("returns null when campaign is completed", () => {
      const campaign: CampaignState = {
        ...createDefaultCampaign("lead-1", "deed_transfer"),
        status: "completed",
      };
      expect(getNextStep(campaign)).toBeNull();
    });

    it("returns null when campaign is paused", () => {
      const campaign: CampaignState = {
        ...createDefaultCampaign("lead-1", "deed_transfer"),
        status: "paused",
      };
      expect(getNextStep(campaign)).toBeNull();
    });

    it("returns null when campaign is cancelled", () => {
      const campaign: CampaignState = {
        ...createDefaultCampaign("lead-1", "deed_transfer"),
        status: "cancelled",
      };
      expect(getNextStep(campaign)).toBeNull();
    });

    it("returns null when all steps are exhausted", () => {
      const campaign: CampaignState = {
        ...createDefaultCampaign("lead-1", "deed_transfer"),
        currentStep: 5,
      };
      expect(getNextStep(campaign)).toBeNull();
    });
  });

  describe("step sequence progression", () => {
    it("advances through each step in order", () => {
      let campaign = createDefaultCampaign("lead-1", "deed_transfer");

      for (let i = 0; i < 5; i++) {
        const step = getNextStep(campaign);
        expect(step).not.toBeNull();
        expect(step!.order).toBe(i + 1);
        campaign = advanceCampaign(campaign);
      }

      expect(campaign.currentStep).toBe(5);
      expect(campaign.status).toBe("completed");
      expect(getNextStep(campaign)).toBeNull();
    });

    it("tracks lastStepAt on each advance", () => {
      let campaign = createDefaultCampaign("lead-1", "generic_signal");
      expect(campaign.lastStepAt).toBeNull();

      campaign = advanceCampaign(campaign);
      expect(campaign.lastStepAt).toBeInstanceOf(Date);
    });
  });

  describe("multi-touch cadence state", () => {
    it("maintains correct state through partial progression", () => {
      let campaign = createDefaultCampaign("lead-1", "deed_transfer");

      campaign = advanceCampaign(campaign);
      campaign = advanceCampaign(campaign);

      expect(campaign.currentStep).toBe(2);
      expect(campaign.status).toBe("active");

      const nextStep = getNextStep(campaign);
      expect(nextStep).not.toBeNull();
      expect(nextStep!.order).toBe(3);
      expect(nextStep!.channel).toBe("voicemail");
    });
  });

  describe("campaign completion", () => {
    it("marks campaign as completed after final step", () => {
      let campaign = createDefaultCampaign("lead-1", "generic_signal");
      // standard campaign has 4 steps
      for (let i = 0; i < 4; i++) {
        campaign = advanceCampaign(campaign);
      }
      expect(campaign.status).toBe("completed");
      expect(campaign.currentStep).toBe(4);
    });

    it("remains active before final step", () => {
      let campaign = createDefaultCampaign("lead-1", "generic_signal");
      for (let i = 0; i < 3; i++) {
        campaign = advanceCampaign(campaign);
      }
      expect(campaign.status).toBe("active");
      expect(campaign.currentStep).toBe(3);
    });
  });

  describe("cancelCampaign", () => {
    it("sets status to cancelled", () => {
      const campaign = createDefaultCampaign("lead-1", "deed_transfer");
      const cancelled = cancelCampaign(campaign);
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.currentStep).toBe(0);
      expect(cancelled.leadId).toBe("lead-1");
    });

    it("can cancel a partially advanced campaign", () => {
      let campaign = createDefaultCampaign("lead-1", "deed_transfer");
      campaign = advanceCampaign(campaign);
      campaign = advanceCampaign(campaign);

      const cancelled = cancelCampaign(campaign);
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.currentStep).toBe(2);
    });
  });
});
