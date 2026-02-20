import { LoggerPort } from "../../../src/domain/ports/outbound/logger.port";

/**
 * MockLoggerPort: Tracks all logging calls for testing.
 */
export class MockLoggerPort implements LoggerPort {
  logs: Array<{ level: string; message: string; context?: string }> = [];

  log(message: string, context?: string): void {
    this.logs.push({ level: "log", message, context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logs.push({ level: "error", message, context });
  }

  warn(message: string, context?: string): void {
    this.logs.push({ level: "warn", message, context });
  }

  debug(message: string, context?: string): void {
    this.logs.push({ level: "debug", message, context });
  }

  verbose(message: string, context?: string): void {
    this.logs.push({ level: "verbose", message, context });
  }

  getLogsByLevel(level: string) {
    return this.logs.filter((l) => l.level === level);
  }

  hasLog(message: string): boolean {
    return this.logs.some((l) => l.message.includes(message));
  }

  reset() {
    this.logs = [];
  }
}
