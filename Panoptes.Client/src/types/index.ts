export interface WebhookSubscription {
    id: string;
    name: string;
    targetUrl: string;
    eventType: string;
    targetAddress?: string | null;
    policyId?: string | null;
    secretKey: string;
    isActive: boolean;
    createdAt: string;
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
