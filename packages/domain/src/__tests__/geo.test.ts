import { describe, it, expect } from "vitest";
import { County, ZipCode, DriveTimeRadius, FL_COUNTIES } from "../value-objects/geo.js";

describe("County", () => {
  it("creates with name, state, and fips", () => {
    const county = County.create("Miami-Dade", "FL", "12086");
    expect(county.name).toBe("Miami-Dade");
    expect(county.state).toBe("FL");
    expect(county.fips).toBe("12086");
  });

  it("trims whitespace from inputs", () => {
    const county = County.create("  Broward  ", " fl ", " 12011 ");
    expect(county.name).toBe("Broward");
    expect(county.state).toBe("FL");
    expect(county.fips).toBe("12011");
  });

  it("uppercases state abbreviation", () => {
    const county = County.create("Palm Beach", "fl", "12099");
    expect(county.state).toBe("FL");
  });

  it("fullName returns formatted county name", () => {
    const county = County.create("Orange", "FL", "12095");
    expect(county.fullName).toBe("Orange County, FL");
  });

  it("equals compares by fips code", () => {
    const a = County.create("Miami-Dade", "FL", "12086");
    const b = County.create("Miami-Dade", "FL", "12086");
    expect(a.equals(b)).toBe(true);
  });

  it("equals returns false for different fips codes", () => {
    const a = County.create("Miami-Dade", "FL", "12086");
    const b = County.create("Broward", "FL", "12011");
    expect(a.equals(b)).toBe(false);
  });

  it("toJSON returns plain object", () => {
    const county = County.create("Hillsborough", "FL", "12057");
    expect(county.toJSON()).toEqual({
      name: "Hillsborough",
      state: "FL",
      fips: "12057",
    });
  });
});

describe("ZipCode", () => {
  it("creates from valid 5-digit string", () => {
    const zip = ZipCode.create("33101");
    expect(zip.value).toBe("33101");
  });

  it("strips non-digit characters", () => {
    const zip = ZipCode.create("33-101");
    expect(zip.value).toBe("33101");
  });

  it("handles ZIP+4 format by taking first 5 digits", () => {
    const zip = ZipCode.create("33101-1234");
    expect(zip.value).toBe("33101");
  });

  it("throws for too-short zip code", () => {
    expect(() => ZipCode.create("123")).toThrow("Invalid ZIP code");
  });

  it("throws for empty string", () => {
    expect(() => ZipCode.create("")).toThrow("Invalid ZIP code");
  });

  it("throws for non-numeric string with fewer than 5 digits", () => {
    expect(() => ZipCode.create("abcd")).toThrow("Invalid ZIP code");
  });

  it("prefix returns first 3 digits", () => {
    const zip = ZipCode.create("33101");
    expect(zip.prefix).toBe("331");
  });

  it("equals compares by value", () => {
    const a = ZipCode.create("33101");
    const b = ZipCode.create("33101");
    expect(a.equals(b)).toBe(true);
  });

  it("equals returns false for different zips", () => {
    const a = ZipCode.create("33101");
    const b = ZipCode.create("33102");
    expect(a.equals(b)).toBe(false);
  });

  it("toString returns the zip string", () => {
    const zip = ZipCode.create("90210");
    expect(zip.toString()).toBe("90210");
  });
});

describe("DriveTimeRadius", () => {
  it("creates with valid center zip and minutes", () => {
    const radius = DriveTimeRadius.create("33101", 30);
    expect(radius.centerZip).toBe("33101");
    expect(radius.minutes).toBe(30);
  });

  it("accepts 1 minute as minimum", () => {
    const radius = DriveTimeRadius.create("33101", 1);
    expect(radius.minutes).toBe(1);
  });

  it("accepts 180 minutes as maximum", () => {
    const radius = DriveTimeRadius.create("33101", 180);
    expect(radius.minutes).toBe(180);
  });

  it("throws for 0 minutes", () => {
    expect(() => DriveTimeRadius.create("33101", 0)).toThrow("Drive time must be 1-180 minutes");
  });

  it("throws for negative minutes", () => {
    expect(() => DriveTimeRadius.create("33101", -10)).toThrow("Drive time must be 1-180 minutes");
  });

  it("throws for minutes exceeding 180", () => {
    expect(() => DriveTimeRadius.create("33101", 200)).toThrow("Drive time must be 1-180 minutes");
  });

  it("toJSON returns plain object", () => {
    const radius = DriveTimeRadius.create("33101", 45);
    expect(radius.toJSON()).toEqual({ centerZip: "33101", minutes: 45 });
  });
});

describe("FL_COUNTIES", () => {
  it("contains 67 Florida counties", () => {
    expect(FL_COUNTIES).toHaveLength(67);
  });

  it("includes well-known counties", () => {
    expect(FL_COUNTIES).toContain("Miami-Dade");
    expect(FL_COUNTIES).toContain("Broward");
    expect(FL_COUNTIES).toContain("Palm Beach");
    expect(FL_COUNTIES).toContain("Hillsborough");
    expect(FL_COUNTIES).toContain("Orange");
  });

  it("includes counties with special characters", () => {
    expect(FL_COUNTIES).toContain("St. Johns");
    expect(FL_COUNTIES).toContain("St. Lucie");
  });
});
