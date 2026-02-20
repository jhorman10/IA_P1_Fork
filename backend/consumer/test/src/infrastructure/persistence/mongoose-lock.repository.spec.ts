/**
 * 🧪 Tests for MongooseLockRepository
 *
 * Tests distributed lock acquisition/release using MongoDB
 */

import { MongooseLockRepository } from "../../../../src/infrastructure/persistence/mongoose-lock.repository";
import { Connection } from "mongoose";
import { Logger } from "@nestjs/common";

describe("MongooseLockRepository", () => {
  let repository: MongooseLockRepository;
  let mockConnection: jest.Mocked<Connection>;
  let mockCollection: any;

  beforeEach(() => {
    // Mock collection methods
    mockCollection = {
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
    };

    // Mock connection
    mockConnection = {
      collection: jest.fn().mockReturnValue(mockCollection),
    } as any;

    // Create repository
    repository = new MongooseLockRepository(mockConnection);

    // Suppress logging
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("acquire()", () => {
    it("should acquire lock when lock does not exist", async () => {
      const lockName = "appointment-123";
      const ttlMs = 5000;

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        _id: lockName,
        expiresAt: Date.now() + ttlMs,
        acquiredAt: expect.any(Number),
      });

      const result = await repository.acquire(lockName, ttlMs);

      expect(result).toBe(true);
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: lockName,
          $or: [
            { expiresAt: { $lt: expect.any(Number) } },
            { expiresAt: { $exists: false } },
          ],
        },
        {
          $set: {
            _id: lockName,
            expiresAt: expect.any(Number),
            acquiredAt: expect.any(Number),
          },
        },
        { upsert: true, returnDocument: "after" },
      );
    });

    it("should acquire lock when existing lock has expired", async () => {
      const lockName = "office-scheduler";
      const ttlMs = 10000;
      const now = Date.now();

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        _id: lockName,
        expiresAt: now + ttlMs,
        acquiredAt: now,
      });

      const result = await repository.acquire(lockName, ttlMs);

      expect(result).toBe(true);

      // Verify expiration check includes < now (expired locks)
      const callArgs = mockCollection.findOneAndUpdate.mock.calls[0];
      expect(callArgs[0].$or).toContainEqual({
        expiresAt: { $lt: expect.any(Number) },
      });
    });

    it("should fail to acquire lock when another holder has active lock", async () => {
      const lockName = "concurrent-lock";
      const ttlMs = 5000;

      // Simulate duplicate key error
      mockCollection.findOneAndUpdate.mockRejectedValueOnce(
        new Error("E11000 duplicate key error"),
      );

      const result = await repository.acquire(lockName, ttlMs);

      expect(result).toBe(false);
    });

    it("should set correct TTL expiration time", async () => {
      const lockName = "ttl-test";
      const ttlMs = 3000;
      const beforeTime = Date.now();

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        _id: lockName,
        expiresAt: expect.any(Number),
      });

      await repository.acquire(lockName, ttlMs);

      const expiresAt =
        mockCollection.findOneAndUpdate.mock.calls[0][1].$set.expiresAt;
      const afterTime = Date.now() + ttlMs;

      // expiresAt should be within reasonable bounds
      expect(expiresAt).toBeGreaterThanOrEqual(beforeTime + ttlMs);
      expect(expiresAt).toBeLessThanOrEqual(afterTime + 100); // Allow 100ms jitter
    });

    it("should use lockName as unique identifier", async () => {
      const lockName = "unique-id-12345";
      const ttlMs = 5000;

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({});

      await repository.acquire(lockName, ttlMs);

      const queryFilter = mockCollection.findOneAndUpdate.mock.calls[0][0];
      expect(queryFilter._id).toBe(lockName);
    });

    it("should handle zero TTL", async () => {
      const lockName = "zero-ttl";
      const ttlMs = 0;

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({});

      const result = await repository.acquire(lockName, ttlMs);

      expect(result).toBe(true);

      // getExpiresAt should equal now (no TTL extension)
      const expiresAt =
        mockCollection.findOneAndUpdate.mock.calls[0][1].$set.expiresAt;
      const now = Date.now();
      expect(expiresAt).toBeLessThanOrEqual(now + 50); // Very small window
    });

    it("should handle large TTL values", async () => {
      const lockName = "large-ttl";
      const ttlMs = 86400000; // 24 hours

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({});

      const result = await repository.acquire(lockName, ttlMs);

      expect(result).toBe(true);

      const expiresAt =
        mockCollection.findOneAndUpdate.mock.calls[0][1].$set.expiresAt;
      const now = Date.now();

      expect(expiresAt).toBeGreaterThan(now + ttlMs - 100);
      expect(expiresAt).toBeLessThanOrEqual(now + ttlMs + 100);
    });

    it("should record acquiredAt timestamp", async () => {
      const lockName = "timestamp-test";
      const ttlMs = 5000;
      const beforeTime = Date.now();

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({});

      await repository.acquire(lockName, ttlMs);

      const acquiredAt =
        mockCollection.findOneAndUpdate.mock.calls[0][1].$set.acquiredAt;
      const afterTime = Date.now();

      expect(acquiredAt).toBeGreaterThanOrEqual(beforeTime);
      expect(acquiredAt).toBeLessThanOrEqual(afterTime);
    });

    it("should handle MongoDB connection errors", async () => {
      const lockName = "error-test";
      const ttlMs = 5000;

      mockCollection.findOneAndUpdate.mockRejectedValueOnce(
        new Error("MongoDB connection refused"),
      );

      const result = await repository.acquire(lockName, ttlMs);

      expect(result).toBe(false);
    });

    it("should use upsert strategy", async () => {
      const lockName = "upsert-test";
      const ttlMs = 5000;

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({});

      await repository.acquire(lockName, ttlMs);

      const options = mockCollection.findOneAndUpdate.mock.calls[0][2];
      expect(options.upsert).toBe(true);
      expect(options.returnDocument).toBe("after");
    });

    it("should check expiration condition correctly", async () => {
      const lockName = "expiration-check";
      const ttlMs = 5000;

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({});

      await repository.acquire(lockName, ttlMs);

      const queryFilter = mockCollection.findOneAndUpdate.mock.calls[0][0];

      // Should check if expiresAt < now (expired) OR expiresAt doesn't exist (never acquired)
      expect(queryFilter.$or).toBeDefined();
      expect(queryFilter.$or.length).toBe(2);
      expect(queryFilter.$or[0]).toHaveProperty("expiresAt");
      expect(queryFilter.$or[1]).toEqual({ expiresAt: { $exists: false } });
    });
  });

  describe("release()", () => {
    it("should delete lock document", async () => {
      const lockName = "lock-to-release";

      mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      await repository.release(lockName);

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({
        _id: lockName,
      });
    });

    it("should handle no lock existing (idempotent)", async () => {
      const lockName = "non-existent-lock";

      mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });

      // Should not throw
      await expect(repository.release(lockName)).resolves.not.toThrow();

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({
        _id: lockName,
      });
    });

    it("should handle MongoDB errors gracefully", async () => {
      const lockName = "error-lock";

      mockCollection.deleteOne.mockRejectedValueOnce(
        new Error("MongoDB error"),
      );

      // Should not throw
      await expect(repository.release(lockName)).resolves.not.toThrow();
    });

    it("should use lockName as deletion filter", async () => {
      const lockName = "unique-release-id";

      mockCollection.deleteOne.mockResolvedValueOnce({});

      await repository.release(lockName);

      const filter = mockCollection.deleteOne.mock.calls[0][0];
      expect(filter._id).toBe(lockName);
    });
  });

  describe("Integration Pattern", () => {
    it("should implement LockRepository interface", () => {
      expect(repository).toHaveProperty("acquire");
      expect(repository).toHaveProperty("release");
      expect(typeof repository.acquire).toBe("function");
      expect(typeof repository.release).toBe("function");
    });

    it("should complete acquire and release cycle", async () => {
      const lockName = "cycle-test";
      const ttlMs = 5000;

      // Acquire
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        _id: lockName,
        expiresAt: Date.now() + ttlMs,
      });

      const acquireResult = await repository.acquire(lockName, ttlMs);
      expect(acquireResult).toBe(true);

      // Release
      mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      await repository.release(lockName);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(mockCollection.deleteOne).toHaveBeenCalled();
    });

    it("should get correct collection from connection", async () => {
      const lockName = "collection-test";
      const ttlMs = 5000;

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({});
      mockCollection.deleteOne.mockResolvedValueOnce({});

      await repository.acquire(lockName, ttlMs);
      await repository.release(lockName);

      // Verify collection is retrived with correct name
      expect(mockConnection.collection).toHaveBeenCalledWith("locks");
    });

    it("should handle concurrent lock attempts", async () => {
      const lockName = "concurrent-test";
      const ttlMs = 5000;

      // First call succeeds
      mockCollection.findOneAndUpdate.mockResolvedValueOnce({
        _id: lockName,
      });

      const result1 = await repository.acquire(lockName, ttlMs);
      expect(result1).toBe(true);

      // Subsequent call fails
      mockCollection.findOneAndUpdate.mockRejectedValueOnce(
        new Error("E11000 duplicate key"),
      );

      const result2 = await repository.acquire(lockName, ttlMs);
      expect(result2).toBe(false);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe("TTL & Expiration Logic", () => {
    it("should support different TTL durations", async () => {
      const ttlDurations = [100, 1000, 5000, 60000];

      for (const ttlMs of ttlDurations) {
        mockCollection.findOneAndUpdate.mockResolvedValueOnce({});

        await repository.acquire(`lock-${ttlMs}`, ttlMs);

        const expiresAt =
          mockCollection.findOneAndUpdate.mock.calls.pop()[1].$set.expiresAt;
        const now = Date.now();

        expect(expiresAt - now).toBeGreaterThanOrEqual(ttlMs - 50);
        expect(expiresAt - now).toBeLessThanOrEqual(ttlMs + 50);
      }
    });

    it("should atomically check expiration and acquire", async () => {
      const lockName = "atomic-test";
      const ttlMs = 5000;

      mockCollection.findOneAndUpdate.mockResolvedValueOnce({});

      await repository.acquire(lockName, ttlMs);

      // Verify single atomic operation (not separate checks)
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(1);

      // Verify query checks expiration in one go
      const query = mockCollection.findOneAndUpdate.mock.calls[0][0];
      expect(query).toHaveProperty("_id", lockName);
      expect(query).toHaveProperty("$or");
    });
  });

  describe("Error Recovery", () => {
    it("should not throw on acquire failure", async () => {
      const lockName = "no-throw-acquire";

      mockCollection.findOneAndUpdate.mockRejectedValueOnce(
        new Error("Any error"),
      );

      await expect(repository.acquire(lockName, 5000)).resolves.not.toThrow();
    });

    it("should not throw on release failure", async () => {
      const lockName = "no-throw-release";

      mockCollection.deleteOne.mockRejectedValueOnce(new Error("Any error"));

      await expect(repository.release(lockName)).resolves.not.toThrow();
    });

    it("should handle various error types", async () => {
      const lockName = "error-types";

      const errors = [
        new Error("Network timeout"),
        new Error("E11000 duplicate"),
        new Error("MongoServerError"),
        new TypeError("Invalid argument"),
      ];

      for (const error of errors) {
        mockCollection.findOneAndUpdate.mockRejectedValueOnce(error);

        const result = await repository.acquire(lockName, 5000);
        expect(result).toBe(false);
      }
    });
  });
});
