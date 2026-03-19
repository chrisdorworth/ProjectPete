export class County {
  private constructor(
    public readonly name: string,
    public readonly state: string,
    public readonly fips: string,
  ) {}

  static create(name: string, state: string, fips: string): County {
    return new County(name.trim(), state.trim().toUpperCase(), fips.trim());
  }

  get fullName(): string {
    return `${this.name} County, ${this.state}`;
  }

  equals(other: County): boolean {
    return this.fips === other.fips;
  }

  toJSON(): { name: string; state: string; fips: string } {
    return { name: this.name, state: this.state, fips: this.fips };
  }
}

export class ZipCode {
  private constructor(public readonly value: string) {}

  static create(zip: string): ZipCode {
    const cleaned = zip.replace(/\D/g, "").slice(0, 5);
    if (cleaned.length !== 5) {
      throw new Error(`Invalid ZIP code: ${zip}`);
    }
    return new ZipCode(cleaned);
  }

  get prefix(): string {
    return this.value.slice(0, 3);
  }

  equals(other: ZipCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class DriveTimeRadius {
  private constructor(
    public readonly centerZip: string,
    public readonly minutes: number,
  ) {}

  static create(centerZip: string, minutes: number): DriveTimeRadius {
    if (minutes <= 0 || minutes > 180) {
      throw new Error(`Drive time must be 1-180 minutes, got ${minutes}`);
    }
    return new DriveTimeRadius(centerZip, minutes);
  }

  toJSON(): { centerZip: string; minutes: number } {
    return { centerZip: this.centerZip, minutes: this.minutes };
  }
}

export const FL_COUNTIES = [
  "Alachua", "Baker", "Bay", "Bradford", "Brevard", "Broward", "Calhoun",
  "Charlotte", "Citrus", "Clay", "Collier", "Columbia", "DeSoto", "Dixie",
  "Duval", "Escambia", "Flagler", "Franklin", "Gadsden", "Gilchrist",
  "Glades", "Gulf", "Hamilton", "Hardee", "Hendry", "Hernando", "Highlands",
  "Hillsborough", "Holmes", "Indian River", "Jackson", "Jefferson",
  "Lafayette", "Lake", "Lee", "Leon", "Levy", "Liberty", "Madison",
  "Manatee", "Marion", "Martin", "Miami-Dade", "Monroe", "Nassau",
  "Okaloosa", "Okeechobee", "Orange", "Osceola", "Palm Beach", "Pasco",
  "Pinellas", "Polk", "Putnam", "Santa Rosa", "Sarasota", "Seminole",
  "St. Johns", "St. Lucie", "Sumter", "Suwannee", "Taylor", "Union",
  "Volusia", "Wakulla", "Walton", "Washington",
] as const;

export type FloridaCounty = (typeof FL_COUNTIES)[number];
