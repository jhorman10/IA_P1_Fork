/**
 * ⚕️ HUMAN CHECK - Puerto de Concurrencia
 * Puerto para bloqueo distribuido que previene condiciones de carrera en escala horizontal.
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
