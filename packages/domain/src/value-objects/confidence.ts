export class Confidence {
  private constructor(
    public readonly value: number,
    public readonly source: string,
  ) {}

  static create(value: number, source: string): Confidence {
    if (value < 0 || value > 1) {
      throw new Error(`Confidence must be between 0.0 and 1.0, got ${value}`);
    }
    return new Confidence(Math.round(value * 1000) / 1000, source);
  }

  static high(source: string): Confidence {
    return new Confidence(0.95, source);
  }

  static medium(source: string): Confidence {
    return new Confidence(0.7, source);
  }

  static low(source: string): Confidence {
    return new Confidence(0.4, source);
  }

  static zero(source: string): Confidence {
    return new Confidence(0, source);
  }

  isHigh(): boolean {
    return this.value >= 0.8;
  }

  isMedium(): boolean {
    return this.value >= 0.5 && this.value < 0.8;
  }

  isLow(): boolean {
    return this.value < 0.5;
  }

  combine(other: Confidence): Confidence {
    const combined = 1 - (1 - this.value) * (1 - other.value);
    return Confidence.create(combined, `${this.source}+${other.source}`);
  }

  equals(other: Confidence): boolean {
    return this.value === other.value && this.source === other.source;
  }

  toJSON(): { value: number; source: string } {
    return { value: this.value, source: this.source };
  }
}
