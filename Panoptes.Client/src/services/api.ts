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

export const triggerTestEvent = async (id: string): Promise<DeliveryLog> => {
    const response = await api.post<DeliveryLog>(`/Subscriptions/test/${id}`);
    return response.data;
};

export const updateSubscription = async (id: string, data: Partial<WebhookSubscription>): Promise<WebhookSubscription> => {
    const response = await api.put<WebhookSubscription>(`/Subscriptions/${id}`, data);
    return response.data;
};

export const deleteSubscription = async (id: string): Promise<void> => {
    await api.delete(`/Subscriptions/${id}`);
};

export const toggleSubscriptionActive = async (id: string): Promise<WebhookSubscription> => {
    const response = await api.post<WebhookSubscription>(`/Subscriptions/${id}/toggle`);
    return response.data;
};

export const resetSubscription = async (id: string): Promise<WebhookSubscription> => {
    const response = await api.post<WebhookSubscription>(`/Subscriptions/${id}/reset`);
    return response.data;
};

export default api;
