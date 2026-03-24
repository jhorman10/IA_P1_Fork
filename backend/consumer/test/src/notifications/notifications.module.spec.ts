import { Test, TestingModule } from "@nestjs/testing";

import { NestLoggerAdapter } from "../../../src/infrastructure/logging/nest-logger.adapter";

describe("NestLoggerAdapter", () => {
  let adapter: NestLoggerAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NestLoggerAdapter],
    }).compile();

    adapter = module.get<NestLoggerAdapter>(NestLoggerAdapter);
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  it("should have log method", () => {
    expect(adapter.log).toBeDefined();
    expect(typeof adapter.log).toBe("function");
  });

  it("should have error method", () => {
    expect(adapter.error).toBeDefined();
    expect(typeof adapter.error).toBe("function");
  });

  it("should have warn method", () => {
    expect(adapter.warn).toBeDefined();
    expect(typeof adapter.warn).toBe("function");
  });

  it("should have debug method", () => {
    expect(adapter.debug).toBeDefined();
    expect(typeof adapter.debug).toBe("function");
  });

  it("should have verbose method", () => {
    expect(adapter.verbose).toBeDefined();
    expect(typeof adapter.verbose).toBe("function");
  });

  // HUMAN CHECK: Smoke tests - ensure all log methods execute without throwing
  it("should call log without throwing", () => {
    expect(() => adapter.log("Test message")).not.toThrow();
    expect(() => adapter.log("Test message", "Context")).not.toThrow();
  });

  it("should call error without throwing", () => {
    expect(() => adapter.error("Error message")).not.toThrow();
    expect(() => adapter.error("Error message", "Stack trace")).not.toThrow();
    expect(() =>
      adapter.error("Error message", "Stack trace", "Context"),
    ).not.toThrow();
  });

  it("should call warn without throwing", () => {
    expect(() => adapter.warn("Warning message")).not.toThrow();
    expect(() => adapter.warn("Warning message", "Context")).not.toThrow();
  });

  it("should call debug without throwing", () => {
    expect(() => adapter.debug("Debug message")).not.toThrow();
    expect(() => adapter.debug("Debug message", "Context")).not.toThrow();
  });

  it("should call verbose without throwing", () => {
    expect(() => adapter.verbose("Verbose message")).not.toThrow();
    expect(() => adapter.verbose("Verbose message", "Context")).not.toThrow();
  });
});
