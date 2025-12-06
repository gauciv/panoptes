import axios from 'axios';
import { WebhookSubscription, DeliveryLog } from '../types';

// Assuming the backend runs on port 5000 (http) or 5001 (https). 
// Adjust the baseURL as needed.
const api = axios.create({
    baseURL: 'http://localhost:5000',
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

export const getLogs = async (): Promise<DeliveryLog[]> => {
    const response = await api.get<DeliveryLog[]>('/logs');
    return response.data;
};

export const triggerTestEvent = async (id: string): Promise<DeliveryLog> => {
    const response = await api.post<DeliveryLog>(`/Subscriptions/test/${id}`);
    return response.data;
};

export default api;
