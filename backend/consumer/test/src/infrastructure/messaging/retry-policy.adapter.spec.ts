/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 🧪 Tests for RetryPolicyAdapter
 *
 * Tests retry policy decisions (DLQ vs retry)
 */

import { ConfigService } from "@nestjs/config";

import { ValidationError } from "../../../../src/domain/errors/validation.error";
import { RetryPolicyAdapter } from "../../../../src/infrastructure/messaging/retry-policy.adapter";

describe("RetryPolicyAdapter", () => {
  let adapter: RetryPolicyAdapter;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    } as any;
  });

  describe("Constructor and Configuration", () => {
    it("should read MAX_RETRIES from config service", () => {
      mockConfigService.get.mockReturnValue("3");

      adapter = new RetryPolicyAdapter(mockConfigService);

      expect(mockConfigService.get).toHaveBeenCalledWith("MAX_RETRIES");
      expect(adapter.getMaxRetries()).toBe(3);
    });

    it("should default to 2 retries if MAX_RETRIES not configured", () => {
      mockConfigService.get.mockReturnValue(undefined);

      adapter = new RetryPolicyAdapter(mockConfigService);

      expect(adapter.getMaxRetries()).toBe(2);
    });

    it("should default to 2 retries if MAX_RETRIES is null", () => {
      mockConfigService.get.mockReturnValue(null);

      adapter = new RetryPolicyAdapter(mockConfigService);

      expect(adapter.getMaxRetries()).toBe(2);
    });

    it("should parse MAX_RETRIES as number", () => {
      mockConfigService.get.mockReturnValue("5");

      adapter = new RetryPolicyAdapter(mockConfigService);

      expect(typeof adapter.getMaxRetries()).toBe("number");
      expect(adapter.getMaxRetries()).toBe(5);
    });
  });

  describe("shouldMoveToDLQ() - DomainError Handling", () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue("2");
      adapter = new RetryPolicyAdapter(mockConfigService);
    });

    it("should immediately move to DLQ when error is DomainError", () => {
      const domainError = new ValidationError("Invalid appointment");

      const result = adapter.shouldMoveToDLQ(0, domainError);

      expect(result).toBe(true);
    });

    it("should move to DLQ immediately regardless of retryCount", () => {
      const domainError = new ValidationError("Validation failed");

      // Even with 0 retries, DomainError goes to DLQ immediately
      expect(adapter.shouldMoveToDLQ(0, domainError)).toBe(true);
      // Even with 1 retry already done
      expect(adapter.shouldMoveToDLQ(1, domainError)).toBe(true);
      // Even if retryCount < maxRetries
      expect(adapter.shouldMoveToDLQ(0, domainError)).toBe(true);
    });

    it("should not move to DLQ for generic errors", () => {
      const genericError = new Error("Network timeout");

      const result = adapter.shouldMoveToDLQ(0, genericError);

      expect(result).toBe(false);
    });

    it("should not move to DLQ for non-Error objects", () => {
      const result = adapter.shouldMoveToDLQ(0, "string error");

      expect(result).toBe(false);
    });
  });

  describe("shouldMoveToDLQ() - Retry Count Exhaust", () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue("2");
      adapter = new RetryPolicyAdapter(mockConfigService);
    });

    it("should not move to DLQ if retryCount < maxRetries", () => {
      const genericError = new Error("Temporary failure");

      const result = adapter.shouldMoveToDLQ(0, genericError);

      expect(result).toBe(false);
    });

    it("should move to DLQ when retryCount equals maxRetries", () => {
      const genericError = new Error("Persistent failure");

      const result = adapter.shouldMoveToDLQ(2, genericError);

      expect(result).toBe(true);
    });

    it("should move to DLQ when retryCount exceeds maxRetries", () => {
      const genericError = new Error("Failure after retries");

      const result = adapter.shouldMoveToDLQ(3, genericError);

      expect(result).toBe(true);
    });

    it("should support incremental retries", () => {
      const error = new Error("Transient error");

      // First attempt, no retries yet
      expect(adapter.shouldMoveToDLQ(0, error)).toBe(false);

      // After 1 retry
      expect(adapter.shouldMoveToDLQ(1, error)).toBe(false);

      // After 2 retries (= maxRetries) - move to DLQ
      expect(adapter.shouldMoveToDLQ(2, error)).toBe(true);
    });
  });

  describe("shouldMoveToDLQ() - Boundary Cases", () => {
    it("should handle maxRetries = 0 (fail immediately)", () => {
      mockConfigService.get.mockReturnValue("0");
      adapter = new RetryPolicyAdapter(mockConfigService);

      const error = new Error("Fail immediately");

      expect(adapter.shouldMoveToDLQ(0, error)).toBe(true);
    });

    it("should handle maxRetries = 1 (one retry only)", () => {
      mockConfigService.get.mockReturnValue("1");
      adapter = new RetryPolicyAdapter(mockConfigService);

      const error = new Error("Limited retries");

      expect(adapter.shouldMoveToDLQ(0, error)).toBe(false);
      expect(adapter.shouldMoveToDLQ(1, error)).toBe(true);
    });

    it("should handle large maxRetries (10+)", () => {
      mockConfigService.get.mockReturnValue("10");
      adapter = new RetryPolicyAdapter(mockConfigService);

      const error = new Error("Allow many retries");

      for (let i = 0; i < 9; i++) {
        expect(adapter.shouldMoveToDLQ(i, error)).toBe(false);
      }
      expect(adapter.shouldMoveToDLQ(10, error)).toBe(true);
    });
  });

  describe("getMaxRetries()", () => {
    it("should return maxRetries value", () => {
      mockConfigService.get.mockReturnValue("4");
      adapter = new RetryPolicyAdapter(mockConfigService);

      expect(adapter.getMaxRetries()).toBe(4);
    });

    it("should be consistent across multiple calls", () => {
      mockConfigService.get.mockReturnValue("3");
      adapter = new RetryPolicyAdapter(mockConfigService);

      const first = adapter.getMaxRetries();
      const second = adapter.getMaxRetries();

      expect(first).toBe(second);
      expect(first).toBe(3);
    });
  });

  describe("Integration Pattern", () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue("3");
      adapter = new RetryPolicyAdapter(mockConfigService);
    });

    it("should implement RetryPolicyPort interface", () => {
      expect(adapter).toHaveProperty("shouldMoveToDLQ");
      expect(adapter).toHaveProperty("getMaxRetries");
      expect(typeof adapter.shouldMoveToDLQ).toBe("function");
      expect(typeof adapter.getMaxRetries).toBe("function");
    });

    it("should handle mixed error types in sequence", () => {
      const domainError = new ValidationError("Business logic error");
      const genericError = new Error("Network error");

      // DomainError immediately to DLQ
      expect(adapter.shouldMoveToDLQ(0, domainError)).toBe(true);

      // Generic error, 0 retries - don't move
      expect(adapter.shouldMoveToDLQ(0, genericError)).toBe(false);

      // Generic error, after 3 retries - move to DLQ
      expect(adapter.shouldMoveToDLQ(3, genericError)).toBe(true);
    });
  });
});
