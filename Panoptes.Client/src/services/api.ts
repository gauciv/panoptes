import axios from 'axios';
import { WebhookSubscription, DeliveryLog } from '../types';

// Assuming the backend runs on port 5000 (http) or 5001 (https). 
// Adjust the baseURL as needed.
const api = axios.create({
    // baseURL: 'http://localhost:5000', // Removed to use relative path (Vite proxy)
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getSubscriptions = async (): Promise<WebhookSubscription[]> => {
    const response = await api.get<WebhookSubscription[]>('/Subscriptions');
    return response.data;
};

export const createSubscription = async (data: Omit<WebhookSubscription, 'id' | 'createdAt'>): Promise<WebhookSubscription> => {
    const response = await api.post<WebhookSubscription>('/Subscriptions', data);
    return response.data;
};

export const getLogs = async (skip?: number, take?: number): Promise<{ logs: DeliveryLog[], totalCount: number }> => {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (take !== undefined) params.append('take', take.toString());
    const response = await api.get<{ logs: DeliveryLog[], totalCount: number }>(`/logs?${params.toString()}`);
    return response.data;
};

export const getSubscriptionLogs = async (subscriptionId: string, skip?: number, take?: number): Promise<{ logs: DeliveryLog[], totalCount: number }> => {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (take !== undefined) params.append('take', take.toString());
    const response = await api.get<{ logs: DeliveryLog[], totalCount: number }>(`/Subscriptions/${subscriptionId}/logs?${params.toString()}`);
    return response.data;
};

export const getSubscription = async (id: string): Promise<WebhookSubscription> => {
    const response = await api.get<WebhookSubscription>(`/Subscriptions/${id}`);
    return response.data;
};

// Existing test function (Backend generated payload)
export const triggerTestEvent = async (id: string): Promise<DeliveryLog> => {
    const response = await api.post<DeliveryLog>(`/Subscriptions/test/${id}`);
    return response.data;
};

// NEW: Direct test function (Frontend provided payload)
export const triggerDirectWebhookTest = async (id: string, payload: any): Promise<any> => {
    // Matches the C# route: [HttpPost("{id}/test")] inside SubscriptionsController
    const response = await api.post<any>(`/Subscriptions/${id}/test`, payload);
    return response.data;
};

export const updateSubscription = async (id: string, data: Partial<WebhookSubscription>): Promise<WebhookSubscription> => {
    const response = await api.put<WebhookSubscription>(`/Subscriptions/${id}`, data);
    return response.data;
};

export const deleteSubscription = async (id: string): Promise<void> => {
    await api.delete(`/Subscriptions/${id}`);
};

export const toggleSubscriptionActive = async (id: string, deliverLatestOnly: boolean = false): Promise<WebhookSubscription> => {
    const response = await api.post<WebhookSubscription>(`/Subscriptions/${id}/toggle?deliverLatestOnly=${deliverLatestOnly}`);
    return response.data;
};

export const resetSubscription = async (id: string): Promise<WebhookSubscription> => {
    const response = await api.post<WebhookSubscription>(`/Subscriptions/${id}/reset`);
    return response.data;
};

export interface HealthResponse {
    status: string;
    timestamp: string;
    version: string;
    uptime: string;
    checks: {
        database: {
            status: string;
            responseTimeMs: number;
            message: string;
            error?: string;
        };
        utxoRpc: {
            status: string;
            latencyMs: number;
            message: string;
            error?: string;
        };
    };
    metrics: {
        activeSubscriptions: number;
        totalSubscriptions: number;
        lastBlockSynced?: number;
        deliveriesLast24h: number;
        successfulDeliveries: number;
        failedDeliveries: number;
        error?: string;
    };
    system: {
        memoryUsageMb: number;
        gcMemoryMb: number;
        threadCount: number;
        processStartTime: string;
        error?: string;
    };
}

export const getHealth = async (): Promise<HealthResponse> => {
    const response = await api.get<HealthResponse>('/health');
    return response.data;
};

// --- NEW: Retry Logic ---

// Fetch execution history/retries for a specific delivery log
// Make sure your backend has a route like: [HttpGet("logs/{id}/retries")]
export const getRetryAttempts = async (logId: string): Promise<any[]> => {
    const response = await api.get<any[]>(`/logs/${logId}/retries`);
    return response.data;
};

// Manually retry a specific delivery log
// Make sure your backend has a route like: [HttpPost("logs/{id}/retry")]
export const triggerManualRetry = async (logId: string): Promise<void> => {
    await api.post(`/logs/${logId}/retry`);
};


export default api;
