/**
 * events.module.ts — module wiring coverage.
 * HUMAN CHECK: Ensures EventsModule compiles and its class identity is correct.
 */

jest.mock("@nestjs/mongoose", () => {
  const actual = jest.requireActual("@nestjs/mongoose");
  return {
    ...actual,
    MongooseModule: {
      ...actual.MongooseModule,
      forFeature: jest.fn().mockReturnValue({ module: class MongooseFeatureModule {} }),
    },
  };
});

jest.mock("@nestjs/websockets", () => ({
  WebSocketGateway: () => () => undefined,
  WebSocketServer: () => () => undefined,
  SubscribeMessage: () => () => undefined,
  OnGatewayInit: jest.fn(),
  OnGatewayConnection: jest.fn(),
  OnGatewayDisconnect: jest.fn(),
}));

jest.mock("socket.io", () => ({
  Server: jest.fn(),
}));

import { EventsModule } from "../../../src/events/events.module";

describe("EventsModule", () => {
  it("should be defined", () => {
    expect(EventsModule).toBeDefined();
  });

  it("should be a class", () => {
    expect(typeof EventsModule).toBe("function");
  });

  it("should be instantiable", () => {
    expect(() => new EventsModule()).not.toThrow();
  });
});
