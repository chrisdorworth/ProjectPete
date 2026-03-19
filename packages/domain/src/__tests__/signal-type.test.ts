import { describe, it, expect } from "vitest";
import {
  SignalTypes,
  SIGNAL_METADATA,
  getSignalWeight,
  getSignalTier,
  type SignalType,
} from "../value-objects/signal-type.js";

describe("SignalTypes", () => {
  it("defines all expected tier 1 government signals", () => {
    expect(SignalTypes.DEED_TRANSFER).toBe("deed_transfer");
    expect(SignalTypes.SEC_FORM4).toBe("sec_form4");
    expect(SignalTypes.SEC_FORM_D).toBe("sec_form_d");
    expect(SignalTypes.SEC_13F).toBe("sec_13f");
    expect(SignalTypes.PROBATE_FILING).toBe("probate_filing");
    expect(SignalTypes.BUSINESS_DISSOLUTION).toBe("business_dissolution");
    expect(SignalTypes.BUSINESS_MERGER).toBe("business_merger");
    expect(SignalTypes.HOMESTEAD_CHANGE).toBe("homestead_change");
    expect(SignalTypes.PROPERTY_VALUE_CHANGE).toBe("property_value_change");
    expect(SignalTypes.DIVORCE_FILING).toBe("divorce_filing");
  });

  it("defines all expected tier 2 regulatory signals", () => {
    expect(SignalTypes.BANKRUPTCY_EMERGENCE).toBe("bankruptcy_emergence");
    expect(SignalTypes.COURT_SETTLEMENT).toBe("court_settlement");
    expect(SignalTypes.PROFESSIONAL_RETIREMENT).toBe("professional_retirement");
    expect(SignalTypes.LICENSE_SURRENDER).toBe("license_surrender");
    expect(SignalTypes.PENSION_ELIGIBLE).toBe("pension_eligible");
    expect(SignalTypes.HIGH_SALARY).toBe("high_salary");
    expect(SignalTypes.TSP_CONTRIBUTION).toBe("tsp_contribution");
    expect(SignalTypes.PATENT_ASSIGNMENT).toBe("patent_assignment");
  });

  it("defines all expected tier 3 commercial signals", () => {
    expect(SignalTypes.NEWS_LIQUIDITY_EVENT).toBe("news_liquidity_event");
    expect(SignalTypes.NEWS_EXECUTIVE_CHANGE).toBe("news_executive_change");
    expect(SignalTypes.NEWS_ACQUISITION).toBe("news_acquisition");
    expect(SignalTypes.LINKEDIN_STATUS_CHANGE).toBe("linkedin_status_change");
    expect(SignalTypes.LINKEDIN_RETIREMENT).toBe("linkedin_retirement");
    expect(SignalTypes.COMMERCIAL_RE_SALE).toBe("commercial_re_sale");
    expect(SignalTypes.AUCTION_CONSIGNMENT).toBe("auction_consignment");
  });

  it("defines all expected tier 4 behavioral signals", () => {
    expect(SignalTypes.INTENT_SURGE).toBe("intent_surge");
    expect(SignalTypes.INTENT_RESEARCH).toBe("intent_research");
    expect(SignalTypes.SOCIAL_RETIREMENT_POST).toBe("social_retirement_post");
    expect(SignalTypes.SOCIAL_LIFE_EVENT).toBe("social_life_event");
  });

  it("has exactly 29 signal types", () => {
    expect(Object.keys(SignalTypes)).toHaveLength(29);
  });
});

describe("SIGNAL_METADATA", () => {
  const allSignalValues = Object.values(SignalTypes) as SignalType[];

  it("has metadata for every signal type", () => {
    for (const signal of allSignalValues) {
      expect(SIGNAL_METADATA[signal]).toBeDefined();
    }
  });

  it("every signal has required fields", () => {
    for (const signal of allSignalValues) {
      const meta = SIGNAL_METADATA[signal];
      expect(typeof meta.label).toBe("string");
      expect(meta.label.length).toBeGreaterThan(0);
      expect(typeof meta.icon).toBe("string");
      expect(meta.icon.length).toBeGreaterThan(0);
      expect(typeof meta.color).toBe("string");
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/);
      expect([1, 2, 3, 4]).toContain(meta.tier);
      expect(typeof meta.baseWeight).toBe("number");
      expect(meta.baseWeight).toBeGreaterThan(0);
      expect(meta.baseWeight).toBeLessThanOrEqual(1);
      expect(typeof meta.description).toBe("string");
    }
  });

  it("tier 1 signals are classified as tier 1", () => {
    const tier1 = [
      "deed_transfer", "sec_form4", "sec_form_d", "sec_13f",
      "probate_filing", "business_dissolution", "business_merger",
      "homestead_change", "property_value_change", "divorce_filing",
    ] as SignalType[];
    for (const signal of tier1) {
      expect(SIGNAL_METADATA[signal].tier).toBe(1);
    }
  });

  it("tier 4 signals are classified as tier 4", () => {
    const tier4 = [
      "intent_surge", "intent_research",
      "social_retirement_post", "social_life_event",
    ] as SignalType[];
    for (const signal of tier4) {
      expect(SIGNAL_METADATA[signal].tier).toBe(4);
    }
  });

  it("sec_form4 has highest base weight among tier 1", () => {
    expect(SIGNAL_METADATA.sec_form4.baseWeight).toBe(0.95);
  });

  it("social_life_event has lowest base weight overall", () => {
    const allWeights = allSignalValues.map((s) => SIGNAL_METADATA[s].baseWeight);
    expect(SIGNAL_METADATA.social_life_event.baseWeight).toBe(Math.min(...allWeights));
  });
});

describe("getSignalWeight", () => {
  it("returns the baseWeight for a signal type", () => {
    expect(getSignalWeight("deed_transfer")).toBe(0.9);
    expect(getSignalWeight("intent_surge")).toBe(0.45);
  });
});

describe("getSignalTier", () => {
  it("returns the correct tier for each signal category", () => {
    expect(getSignalTier("deed_transfer")).toBe(1);
    expect(getSignalTier("bankruptcy_emergence")).toBe(2);
    expect(getSignalTier("news_liquidity_event")).toBe(3);
    expect(getSignalTier("intent_surge")).toBe(4);
  });
});
