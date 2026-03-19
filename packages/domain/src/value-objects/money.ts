/**
 * Money value object — integer cents ONLY (RULE-04).
 * All monetary values in the system use bigint cents.
 * No floats. No decimals. Ever.
 */
export class Money {
  private constructor(public readonly cents: bigint) {}

  static fromCents(cents: bigint | number): Money {
    const value = BigInt(cents);
    if (value < 0n) {
      throw new Error("Money cannot be negative");
    }
    return new Money(value);
  }

  static fromDollars(dollars: number): Money {
    if (dollars < 0) {
      throw new Error("Money cannot be negative");
    }
    return new Money(BigInt(Math.round(dollars * 100)));
  }

  static zero(): Money {
    return new Money(0n);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error("Money multiply factor cannot be negative");
    }
    // Use string-based math for large values to avoid precision loss
    const centsNum = Number(this.cents);
    if (centsNum > Number.MAX_SAFE_INTEGER) {
      // For very large values, split into high/low parts
      const str = this.cents.toString();
      const high = BigInt(str.slice(0, -6) || "0");
      const low = BigInt(str.slice(-6));
      const result = high * BigInt(Math.round(factor * 1_000_000)) + BigInt(Math.round(Number(low) * factor));
      return new Money(result);
    }
    return new Money(BigInt(Math.round(centsNum * factor)));
  }

  isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  isZero(): boolean {
    return this.cents === 0n;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  toDollars(): number {
    return Number(this.cents) / 100;
  }

  toFormattedString(): string {
    const dollars = this.toDollars();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(dollars);
  }

  toJSON(): string {
    return this.cents.toString();
  }

  static fromJSON(value: string): Money {
    return new Money(BigInt(value));
  }
}
