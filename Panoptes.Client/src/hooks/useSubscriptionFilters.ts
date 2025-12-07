import { useState, useMemo, useCallback } from 'react';
import { WebhookSubscription } from '../types';

export type StatusFilter = 'all' | 'active' | 'inactive';
export type SortOption = 'default' | 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'lastWebhook-asc' | 'lastWebhook-desc';

interface FilterState {
  searchQuery: string;
  statusFilter: StatusFilter;
  eventTypeFilter: string;
  sortBy: SortOption;
}

const defaultFilterState: FilterState = {
  searchQuery: '',
  statusFilter: 'all',
  eventTypeFilter: 'all',
  sortBy: 'default',
};

export function useSubscriptionFilters(subscriptions: WebhookSubscription[]) {
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);

  // Get unique event types from subscriptions
  const availableEventTypes = useMemo(() => {
    const types = new Set(subscriptions.map(sub => sub.eventType));
    return Array.from(types).sort();
  }, [subscriptions]);

  // Set search query
  const setSearchQuery = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, searchQuery: value }));
  }, []);

  // Set status filter
  const setStatusFilter = useCallback((value: StatusFilter) => {
    setFilters(prev => ({ ...prev, statusFilter: value }));
  }, []);

  // Set event type filter
  const setEventTypeFilter = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, eventTypeFilter: value }));
  }, []);

  // Set sort option
  const setSortBy = useCallback((value: SortOption) => {
    setFilters(prev => ({ ...prev, sortBy: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilterState);
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim() !== '') count++;
    if (filters.statusFilter !== 'all') count++;
    if (filters.eventTypeFilter !== 'all') count++;
    if (filters.sortBy !== 'default') count++;
    return count;
  }, [filters]);

  // Filter and sort subscriptions
  const filteredSubscriptions = useMemo(() => {
    let result = [...subscriptions];

    // Apply search filter (case-insensitive, matches name or URL)
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      result = result.filter(sub =>
        sub.name.toLowerCase().includes(query) ||
        sub.targetUrl.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.statusFilter !== 'all') {
      const isActive = filters.statusFilter === 'active';
      result = result.filter(sub => sub.isActive === isActive);
    }

    // Apply event type filter
    if (filters.eventTypeFilter !== 'all') {
      result = result.filter(sub => sub.eventType === filters.eventTypeFilter);
    }

    // Apply sorting
    if (filters.sortBy !== 'default') {
      result.sort((a, b) => {
        switch (filters.sortBy) {
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'date-asc':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'date-desc':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'lastWebhook-asc': {
            // Nulls last for ascending
            if (!a.lastWebhookAt && !b.lastWebhookAt) return 0;
            if (!a.lastWebhookAt) return 1;
            if (!b.lastWebhookAt) return -1;
            return new Date(a.lastWebhookAt).getTime() - new Date(b.lastWebhookAt).getTime();
          }
          case 'lastWebhook-desc': {
            // Nulls last for descending
            if (!a.lastWebhookAt && !b.lastWebhookAt) return 0;
            if (!a.lastWebhookAt) return 1;
            if (!b.lastWebhookAt) return -1;
            return new Date(b.lastWebhookAt).getTime() - new Date(a.lastWebhookAt).getTime();
          }
          default:
            return 0;
        }
      });
    }

    return result;
  }, [subscriptions, filters]);

  return {
    // Filter state
    searchQuery: filters.searchQuery,
    statusFilter: filters.statusFilter,
    eventTypeFilter: filters.eventTypeFilter,
    sortBy: filters.sortBy,
    
    // Computed values
    availableEventTypes,
    activeFilterCount,
    filteredSubscriptions,
    
    // Actions
    setSearchQuery,
    setStatusFilter,
    setEventTypeFilter,
    setSortBy,
    clearFilters,
  };
}

