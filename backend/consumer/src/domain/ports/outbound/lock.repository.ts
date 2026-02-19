/**
 * ⚕️ HUMAN CHECK - Concurrency Port
 * Port for distributed locking to prevent race conditions in horizontal scaling.
 */
export interface LockRepository {
    /**
     * Tries to acquire a lock.
     * @returns true if acquired, false otherwise.
     */
    acquire(lockName: string, ttlMs: number): Promise<boolean>;

    /**
     * Releases the lock.
     */
    release(lockName: string): Promise<void>;
}
