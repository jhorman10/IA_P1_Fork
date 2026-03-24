import { ValidationError } from "../errors/validation.error";

export type PriorityLevel = "high" | "medium" | "low";

/**
 * Value Object: AppointmentPriority
 * Encapsulates priority levels and validation.
 */
export class Priority {
  private static readonly VALID_LEVELS: PriorityLevel[] = [
    "high",
    "medium",
    "low",
  ];
  private readonly value: PriorityLevel;

  constructor(value: string | undefined | null) {
    const level = (value || "").toLowerCase() as PriorityLevel;

    if (!Priority.VALID_LEVELS.includes(level)) {
      throw new ValidationError(
        `Invalid priority level: ${value}. Must be one of: ${Priority.VALID_LEVELS.join(", ")}`,
        "INVALID_PRIORITY_LEVEL",
        { value },
      );
    }

    this.value = level;
  }

  public toValue(): PriorityLevel {
    return this.value;
  }

  public equals(other: Priority): boolean {
    return this.value === other.value;
  }

  /**
   * Logic for comparison (for sorting in Domain Specifications).
   */
  public getNumericWeight(): number {
    const weights = { high: 1, medium: 2, low: 3 };
    return weights[this.value];
  }
}
