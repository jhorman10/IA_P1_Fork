// Domain port for retry policy
export interface RetryPolicyPort {
  shouldMoveToDLQ(retryCount: number, error: unknown): boolean;
  getMaxRetries(): number;
}
