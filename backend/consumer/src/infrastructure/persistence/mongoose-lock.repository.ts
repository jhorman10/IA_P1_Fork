import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { LockRepository } from '../../domain/ports/outbound/lock.repository';

// Pattern: Adapter (Infrastructure)
// ⚕️ HUMAN CHECK - Horizontal Scaling Fix (H-20)
// Uses MongoDB unique index or TTL for distributed locking.
// In a real production environment, Redis (Redlock) would be preferred.

@Injectable()
export class MongooseLockRepository implements LockRepository {
    private readonly logger = new Logger(MongooseLockRepository.name);
    private readonly collectionName = 'locks';

    constructor(@InjectConnection() private readonly connection: Connection) { }

    async acquire(lockName: string, ttlMs: number): Promise<boolean> {
        const collection = this.connection.collection(this.collectionName);
        const now = Date.now();

        try {
            // Upsert with condition: Either doesn't exist or is expired
            const result = await collection.findOneAndUpdate(
                {
                    _id: lockName as any,
                    $or: [
                        { expiresAt: { $lt: now } },
                        { expiresAt: { $exists: false } }
                    ]
                },
                {
                    $set: {
                        _id: lockName as any,
                        expiresAt: now + ttlMs,
                        acquiredAt: now
                    }
                },
                { upsert: true, returnDocument: 'after' }
            );

            return !!result;
        } catch (error) {
            // Duplicate key error means someone else has the lock
            return false;
        }
    }

    async release(lockName: string): Promise<void> {
        try {
            await this.connection.collection(this.collectionName).deleteOne({ _id: lockName as any });
        } catch (error) {
            this.logger.error(`Failed to release lock ${lockName}: ${error}`);
        }
    }
}
