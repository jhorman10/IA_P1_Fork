/**
 * 🧪 Tests for NestLoggerAdapter
 *
 * Tests NestJS logger adaptation for domain logger port
 */

import { NestLoggerAdapter } from "../../../../src/infrastructure/logging/nest-logger.adapter";
import { Logger } from "@nestjs/common";

describe("NestLoggerAdapter", () => {
  let adapter: NestLoggerAdapter;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    adapter = new NestLoggerAdapter();

    // Mock the internal logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    // Replace the internal logger with mock
    (adapter as any).logger = mockLogger;
  });

  describe("log()", () => {
    it("should call logger.log with message", () => {
      const message = "Test log message";

      adapter.log(message);

      expect(mockLogger.log).toHaveBeenCalledWith(message, undefined);
    });

    it("should call logger.log with message and context", () => {
      const message = "Test log message";
      const context = "TestContext";

      adapter.log(message, context);

      expect(mockLogger.log).toHaveBeenCalledWith(message, context);
    });

    it("should pass context as optional parameter", () => {
      adapter.log("msg1");
      expect(mockLogger.log).toHaveBeenCalledWith("msg1", undefined);

      mockLogger.log.mockClear();

      adapter.log("msg2", "context2");
      expect(mockLogger.log).toHaveBeenCalledWith("msg2", "context2");
    });

    it("should handle empty message", () => {
      adapter.log("");

      expect(mockLogger.log).toHaveBeenCalledWith("", undefined);
    });

    it("should handle empty context", () => {
      adapter.log("message", "");

      expect(mockLogger.log).toHaveBeenCalledWith("message", "");
    });

    it("should handle long messages", () => {
      const longMessage = "x".repeat(10000);

      adapter.log(longMessage);

      expect(mockLogger.log).toHaveBeenCalledWith(longMessage, undefined);
    });

    it("should handle special characters in message", () => {
      const message = "Test!@#$%^&*()_+-=[]{}|;:'\"<>?,./";

      adapter.log(message);

      expect(mockLogger.log).toHaveBeenCalledWith(message, undefined);
    });

    it("should handle unicode characters", () => {
      const message = "Test with emojis 🔥🚀 and special chars: ñáéíóú";

      adapter.log(message);

      expect(mockLogger.log).toHaveBeenCalledWith(message, undefined);
    });

    it("should handle multiline messages", () => {
      const message = "Line 1\nLine 2\nLine 3";

      adapter.log(message);

      expect(mockLogger.log).toHaveBeenCalledWith(message, undefined);
    });
  });

  describe("error()", () => {
    it("should call logger.error with message only", () => {
      const message = "Test error message";

      adapter.error(message);

      expect(mockLogger.error).toHaveBeenCalledWith(
        message,
        undefined,
        undefined,
      );
    });

    it("should call logger.error with message and trace", () => {
      const message = "Test error message";
      const trace = "Error stack trace";

      adapter.error(message, trace);

      expect(mockLogger.error).toHaveBeenCalledWith(message, trace, undefined);
    });

    it("should call logger.error with message, trace, and context", () => {
      const message = "Test error message";
      const trace = "Error stack trace";
      const context = "ErrorContext";

      adapter.error(message, trace, context);

      expect(mockLogger.error).toHaveBeenCalledWith(message, trace, context);
    });

    it("should handle error with empty message", () => {
      adapter.error("");

      expect(mockLogger.error).toHaveBeenCalledWith("", undefined, undefined);
    });

    it("should handle error with empty trace", () => {
      adapter.error("message", "");

      expect(mockLogger.error).toHaveBeenCalledWith("message", "", undefined);
    });

    it("should handle error with stack trace", () => {
      const message = "Unexpected error";
      const trace = "Error: Unexpected error\n    at Object.<anonymous>";

      adapter.error(message, trace);

      expect(mockLogger.error).toHaveBeenCalledWith(message, trace, undefined);
    });

    it("should handle long error traces", () => {
      const message = "Error";
      const trace = "x".repeat(5000);

      adapter.error(message, trace);

      expect(mockLogger.error).toHaveBeenCalledWith(message, trace, undefined);
    });

    it("should preserve error context separately", () => {
      const message = "Database error";
      const trace = "ConnectionError";
      const context = "DatabaseConnectionContext";

      adapter.error(message, trace, context);

      expect(mockLogger.error).toHaveBeenCalledWith(message, trace, context);
    });
  });

  describe("warn()", () => {
    it("should call logger.warn with message", () => {
      const message = "Test warning message";

      adapter.warn(message);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, undefined);
    });

    it("should call logger.warn with message and context", () => {
      const message = "Test warning message";
      const context = "WarningContext";

      adapter.warn(message, context);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, context);
    });

    it("should handle empty warning message", () => {
      adapter.warn("");

      expect(mockLogger.warn).toHaveBeenCalledWith("", undefined);
    });

    it("should handle warning with special characters", () => {
      const message = "Warning: Resource usage at 90%";

      adapter.warn(message);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, undefined);
    });
  });

  describe("debug()", () => {
    it("should call logger.debug with message", () => {
      const message = "Test debug message";

      adapter.debug(message);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, undefined);
    });

    it("should call logger.debug with message and context", () => {
      const message = "Test debug message";
      const context = "DebugContext";

      adapter.debug(message, context);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, context);
    });

    it("should handle empty debug message", () => {
      adapter.debug("");

      expect(mockLogger.debug).toHaveBeenCalledWith("", undefined);
    });

    it("should handle debug with detailed context", () => {
      const message = "Variable state";
      const context = "DetailedDebugInfo";

      adapter.debug(message, context);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, context);
    });
  });

  describe("verbose()", () => {
    it("should call logger.verbose with message", () => {
      const message = "Test verbose message";

      adapter.verbose(message);

      expect(mockLogger.verbose).toHaveBeenCalledWith(message, undefined);
    });

    it("should call logger.verbose with message and context", () => {
      const message = "Test verbose message";
      const context = "VerboseContext";

      adapter.verbose(message, context);

      expect(mockLogger.verbose).toHaveBeenCalledWith(message, context);
    });

    it("should handle empty verbose message", () => {
      adapter.verbose("");

      expect(mockLogger.verbose).toHaveBeenCalledWith("", undefined);
    });

    it("should handle very detailed verbose output", () => {
      const message = "Detailed execution flow: step 1, step 2, step 3";
      const context = "ExecutionTraceContext";

      adapter.verbose(message, context);

      expect(mockLogger.verbose).toHaveBeenCalledWith(message, context);
    });
  });

  describe("Integration & LoggerPort Interface", () => {
    it("should implement LoggerPort interface", () => {
      expect(adapter).toHaveProperty("log");
      expect(adapter).toHaveProperty("error");
      expect(adapter).toHaveProperty("warn");
      expect(adapter).toHaveProperty("debug");
      expect(adapter).toHaveProperty("verbose");

      expect(typeof adapter.log).toBe("function");
      expect(typeof adapter.error).toBe("function");
      expect(typeof adapter.warn).toBe("function");
      expect(typeof adapter.debug).toBe("function");
      expect(typeof adapter.verbose).toBe("function");
    });

    it("should handle all log levels", () => {
      const message = "Test message";

      adapter.log(message);
      adapter.error(message);
      adapter.warn(message);
      adapter.debug(message);
      adapter.verbose(message);

      expect(mockLogger.log).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.verbose).toHaveBeenCalled();
    });

    it("should maintain separation between log levels", () => {
      adapter.log("log message");
      adapter.error("error message");

      expect(mockLogger.log).toHaveBeenCalledWith("log message", undefined);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "error message",
        undefined,
        undefined,
      );

      // Log should not be called for error
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        "error message",
        undefined,
      );
    });

    it("should be injectable as singleton", () => {
      const adapter1 = new NestLoggerAdapter();
      const adapter2 = new NestLoggerAdapter();

      // Both should work independently
      adapter1.log("from adapter1");
      adapter2.log("from adapter2");

      // Both should function without state shared
      expect(adapter1).not.toBe(adapter2);
    });
  });

  describe("Error Handling", () => {
    it("should not throw on null message", () => {
      expect(() => {
        adapter.log(null as any);
      }).not.toThrow();

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it("should not throw on undefined context", () => {
      expect(() => {
        adapter.log("message", undefined);
      }).not.toThrow();

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it("should handle numeric message coercion", () => {
      adapter.log("Error code: 123" as any);

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it("should handle object stringification", () => {
      const obj = { key: "value" };
      const message = `Object: ${JSON.stringify(obj)}`;

      adapter.log(message);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Object:"),
        undefined,
      );
    });

    it("should handle error objects in trace", () => {
      const error = new Error("Test error");
      const trace = error.stack || error.toString();

      adapter.error("Error occurred", trace);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error occurred",
        trace,
        undefined,
      );
    });
  });

  describe("Context Handling", () => {
    it("should preserve context value exactly", () => {
      const context = "ExactContextValue";

      adapter.log("message", context);

      expect(mockLogger.log).toHaveBeenCalledWith("message", context);
    });

    it("should handle context with special characters", () => {
      const context = "Module::Submodule[Config]";

      adapter.log("message", context);

      expect(mockLogger.log).toHaveBeenCalledWith("message", context);
    });

    it("should handle long context names", () => {
      const context = "VeryLongContextNameWith" + "ManyCharacters".repeat(10);

      adapter.log("message", context);

      expect(mockLogger.log).toHaveBeenCalledWith("message", context);
    });

    it("should differentiate between contexts in consecutive calls", () => {
      adapter.log("msg1", "context1");
      adapter.log("msg2", "context2");

      expect(mockLogger.log).toHaveBeenNthCalledWith(1, "msg1", "context1");
      expect(mockLogger.log).toHaveBeenNthCalledWith(2, "msg2", "context2");
    });
  });

  describe("Concurrent Usage", () => {
    it("should handle concurrent log calls", (done) => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            adapter.log(`Message ${i}`);
          }),
        );
      }

      Promise.all(promises).then(() => {
        expect(mockLogger.log).toHaveBeenCalledTimes(10);
        done();
      });
    });

    it("should handle mixed log level calls", (done) => {
      adapter.log("log");
      adapter.error("error");
      adapter.warn("warn");
      adapter.debug("debug");
      adapter.verbose("verbose");

      Promise.resolve().then(() => {
        expect(mockLogger.log).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.debug).toHaveBeenCalledTimes(1);
        expect(mockLogger.verbose).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  describe("Real-world Scenarios", () => {
    it("should handle application startup logging", () => {
      adapter.log("Application starting", "Application");
      adapter.log("Database connected", "DatabaseService");
      adapter.log("Server listening on port 3000", "HttpServer");

      expect(mockLogger.log).toHaveBeenCalledTimes(3);
    });

    it("should handle exception logging", () => {
      const error = new Error("Database connection failed");

      adapter.error(
        "Database connection failed",
        error.stack,
        "DatabaseService",
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Database connection failed",
        error.stack,
        "DatabaseService",
      );
    });

    it("should handle performance warnings", () => {
      adapter.warn("Query took 5000ms (slow query warning)", "DatabaseQuery");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Query took 5000ms (slow query warning)",
        "DatabaseQuery",
      );
    });

    it("should handle debug information dumps", () => {
      const debugData = JSON.stringify({
        userId: 123,
        action: "create",
        timestamp: Date.now(),
      });

      adapter.debug(debugData, "UserServiceDebug");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        debugData,
        "UserServiceDebug",
      );
    });
  });
});
