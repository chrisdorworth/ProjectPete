/**
 * Money value object — integer cents ONLY (RULE-04).
 * All monetary values in the system use bigint cents.
 * No floats. No decimals. Ever.
 */
export class Money {
  private constructor(public readonly cents: bigint) {}

  static fromCents(cents: bigint | number): Money {
    return new Money(BigInt(cents));
  }

  static fromDollars(dollars: number): Money {
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
    return new Money(BigInt(Math.round(Number(this.cents) * factor)));
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
