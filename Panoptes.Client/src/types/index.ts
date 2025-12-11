export interface WebhookSubscription {
    id: string;
    name: string;
    targetUrl: string;
    eventType: string;
    targetAddress?: string | null;
    policyId?: string | null;
    secretKey: string;
    isActive: boolean;
    isPaused: boolean;
    createdAt: string;
    pausedAt?: string | null;
    maxWebhooksPerMinute: number;
    maxWebhooksPerHour: number;
    enableBatching: boolean;
    batchWindowSeconds: number;
    webhooksInLastMinute?: number;
    webhooksInLastHour?: number;
    lastWebhookAt?: string | null;
    isRateLimited?: boolean;
    isSyncing?: boolean;
    walletAddresses?: string[] | null;
    consecutiveFailures?: number;
    lastFailureAt?: string | null;
    firstFailureInWindowAt?: string | null;
    isCircuitBroken?: boolean;
    circuitBrokenReason?: string | null;
}

export interface DeliveryLog {
    id: string;
    subscriptionId: string;
    responseStatusCode: number;
    payloadJson: string;
    responseBody: string;
    latencyMs: number;
    attemptedAt: string;
}

// In src/types.ts

export interface RetryAttempt {
  id: string;
  attemptNumber: number;
  status: 'success' | 'failure' | 'pending';
  statusCode: number;
  timestamp: string;
  latencyMs: number;
  error?: string;
}