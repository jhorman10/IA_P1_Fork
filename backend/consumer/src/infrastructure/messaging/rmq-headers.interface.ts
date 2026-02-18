/**
 * Typed RabbitMQ message headers for retry tracking.
 * ⚕️ HUMAN CHECK - H-04 Fix: Replaces `any` param in ConsumerController.getRetryCount()
 */
export interface XDeathEntry {
    count?: number;
    exchange?: string;
    queue?: string;
    reason?: string;
    'routing-keys'?: string[];
    time?: { '!': string; value: number };
}

export interface RmqHeaders {
    'x-death'?: XDeathEntry[];
    [key: string]: unknown;
}
