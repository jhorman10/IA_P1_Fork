import { Test, TestingModule } from "@nestjs/testing";

import { HealthController } from "../../src/health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should return status ok", () => {
    const result = controller.check();
    expect(result.status).toBe("ok");
  });

  it("should return a valid ISO timestamp", () => {
    const result = controller.check();
    expect(result.timestamp).toBeDefined();
    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  // HUMAN CHECK: Verifica que el timestamp cambia entre llamadas consecutivas
  it("should return current timestamp on each call", () => {
    const before = Date.now();
    const result = controller.check();
    const after = Date.now();
    const ts = new Date(result.timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
