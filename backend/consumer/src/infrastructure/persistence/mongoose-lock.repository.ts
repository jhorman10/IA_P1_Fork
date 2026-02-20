import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { LockRepository } from "../../domain/ports/outbound/lock.repository";

// Pattern: Adapter (Infrastructure)
// ⚕️ HUMAN CHECK - Corrección para escala horizontal (H-20)
// Usa índice único o TTL de MongoDB para bloqueo distribuido.
// En producción real, se preferiría Redis (Redlock).

@Injectable()
export class MongooseLockRepository implements LockRepository {
  private readonly logger = new Logger(MongooseLockRepository.name);
  private readonly collectionName = "locks";

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async acquire(lockName: string, ttlMs: number): Promise<boolean> {
    const collection = this.connection.collection(this.collectionName);
    const now = Date.now();

    try {
      // ⚕️ HUMAN CHECK - Usar lockName como string _id en vez de ObjectId
      // ObjectId requiere 24 hex chars; lockName es arbitrario
      const result = await collection.findOneAndUpdate(
        {
          _id: lockName as unknown as Types.ObjectId,
          $or: [{ expiresAt: { $lt: now } }, { expiresAt: { $exists: false } }],
        },
        {
          $set: {
            _id: lockName as unknown as Types.ObjectId,
            expiresAt: now + ttlMs,
            acquiredAt: now,
          },
        },
        { upsert: true, returnDocument: "after" },
      );

      this.logger.log(`Lock '${lockName}' acquired: ${!!result}`);
      return !!result;
    } catch (error) {
      // Duplicate key error means someone else has the lock
      this.logger.warn(`Failed to acquire lock '${lockName}': ${error}`);
      return false;
    }
  }

  async release(lockName: string): Promise<void> {
    try {
      // ⚕️ HUMAN CHECK - Usar lockName como string _id
      await this.connection
        .collection(this.collectionName)
        .deleteOne({ _id: lockName as unknown as Types.ObjectId });
      this.logger.log(`Lock '${lockName}' released`);
    } catch (error) {
      this.logger.error(`Failed to release lock ${lockName}: ${error}`);
    }
  }
}
