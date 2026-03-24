describe("AppModule coverage", () => {
  it("initializes with mocked dependencies", () => {
    jest.isolateModules(() => {
      const { AppModule } = require("src/app.module");
      expect(AppModule).toBeDefined();
    });
  });

  it("exposes throttler factory with defaults and overrides", () => {
    jest.isolateModules(() => {
      const { AppModule } = require("src/app.module");
      const { MODULE_METADATA } = require("@nestjs/common/constants");
      const { ThrottlerModule } = require("@nestjs/throttler");

      const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);
      const throttlerDynamicModule = imports.find(
        (entry: any) => entry?.module === ThrottlerModule,
      );

      const throttlerProvider = throttlerDynamicModule?.providers?.find(
        (provider: any) => typeof provider.useFactory === "function",
      );

      expect(throttlerProvider?.useFactory).toBeDefined();

      const factory = throttlerProvider.useFactory as (config: {
        get: (key: string, defaultValue?: number) => number | undefined;
      }) => Array<{ ttl: number; limit: number }>;

      const [defaultConfig] = factory({
        get: () => undefined,
      });

      expect(defaultConfig.ttl).toBe(60000);
      expect(defaultConfig.limit).toBe(100);

      const [customConfig] = factory({
        get: (key: string, defaultValue?: number) => {
          if (key === "THROTTLE_TTL") return 25000;
          if (key === "THROTTLE_LIMIT") return 42;
          return defaultValue;
        },
      });

      expect(customConfig.ttl).toBe(25000);
      expect(customConfig.limit).toBe(42);
    });
  });
});
