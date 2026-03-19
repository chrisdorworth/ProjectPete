export interface ScoreBreakdown {
  signalStrength: number;
  estimatedValue: number;
  timing: number;
  accessibility: number;
  complexity: number;
  convergenceBonus: number;
  intentBonus: number;
  warmPathBonus: number;
}

export class CompositeScore {
  private constructor(
    public readonly total: number,
    public readonly qualitative: number,
    public readonly quantitative: number,
    public readonly breakdown: ScoreBreakdown,
  ) {}

  static create(
    qualitative: number,
    quantitative: number,
    breakdown: ScoreBreakdown,
  ): CompositeScore {
    const total = Math.min(100, Math.max(0, Math.round(qualitative + quantitative)));
    return new CompositeScore(
      total,
      Math.min(50, Math.max(0, qualitative)),
      Math.min(50, Math.max(0, quantitative)),
      breakdown,
    );
  }

  static zero(): CompositeScore {
    return new CompositeScore(0, 0, 0, {
      signalStrength: 0,
      estimatedValue: 0,
      timing: 0,
      accessibility: 0,
      complexity: 0,
      convergenceBonus: 0,
      intentBonus: 0,
      warmPathBonus: 0,
    });
  }

  isHighPriority(): boolean {
    return this.total >= 80;
  }

  isMediumPriority(): boolean {
    return this.total >= 50 && this.total < 80;
  }

  isLowPriority(): boolean {
    return this.total < 50;
  }

  tier(): "hot" | "warm" | "cool" | "cold" {
    if (this.total >= 90) return "hot";
    if (this.total >= 70) return "warm";
    if (this.total >= 40) return "cool";
    return "cold";
  }

  equals(other: CompositeScore): boolean {
    return this.total === other.total;
  }

  toJSON(): {
    total: number;
    qualitative: number;
    quantitative: number;
    breakdown: ScoreBreakdown;
  } {
    return {
      total: this.total,
      qualitative: this.qualitative,
      quantitative: this.quantitative,
      breakdown: this.breakdown,
    };
  }
}
