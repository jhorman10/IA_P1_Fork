import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { DomainError } from "../../../src/domain/errors/domain.error";
import { ValidationError } from "../../../src/domain/errors/validation.error";
import { RetryPolicyAdapter } from "../../../src/infrastructure/messaging/retry-policy.adapter";

describe("RetryPolicyAdapter", () => {
  let adapter: RetryPolicyAdapter;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "MAX_RETRIES") return "3";
        return defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryPolicyAdapter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    adapter = module.get<RetryPolicyAdapter>(RetryPolicyAdapter);
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  it("should return max retries from config", () => {
    expect(adapter.getMaxRetries()).toBe(3);
  });

  it("should default to 2 retries when config is not set", () => {
    mockConfigService.get.mockReturnValue(null);
    const newAdapter = new RetryPolicyAdapter(mockConfigService);
    expect(newAdapter.getMaxRetries()).toBe(2);
  });

  // HUMAN CHECK: Critical test - ValidationError (DomainError subclass) should immediately move to DLQ (fatal errors)
  it("should move to DLQ immediately on DomainError subclass", () => {
    const error = new ValidationError("Domain validation failed");
    expect(adapter.shouldMoveToDLQ(0, error)).toBe(true);
    expect(adapter.shouldMoveToDLQ(1, error)).toBe(true);
  });

  it("should move to DLQ immediately on ValidationError (extends DomainError)", () => {
    const error = new ValidationError("Invalid input");
    expect(adapter.shouldMoveToDLQ(0, error)).toBe(true);
  });

  it("should NOT move to DLQ on transient errors below max retries", () => {
    const error = new Error("Transient error");
    expect(adapter.shouldMoveToDLQ(0, error)).toBe(false);
    expect(adapter.shouldMoveToDLQ(1, error)).toBe(false);
    expect(adapter.shouldMoveToDLQ(2, error)).toBe(false);
  });

  // HUMAN CHECK: Critical test - transient errors should retry up to max, then DLQ
  it("should move to DLQ when retry count reaches max retries", () => {
    const error = new Error("Transient error");
    expect(adapter.shouldMoveToDLQ(3, error)).toBe(true);
    expect(adapter.shouldMoveToDLQ(4, error)).toBe(true);
  });

  it("should move to DLQ exactly at max retries", () => {
    const error = new Error("Transient error");
    expect(adapter.shouldMoveToDLQ(2, error)).toBe(false);
    expect(adapter.shouldMoveToDLQ(3, error)).toBe(true);
  });
});
