import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusFilter, SortOption } from '@/hooks/useSubscriptionFilters';

interface SubscriptionFiltersProps {
  searchQuery: string;
  statusFilter: StatusFilter;
  eventTypeFilter: string;
  sortBy: SortOption;
  activeFilterCount: number;
  availableEventTypes: string[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onEventTypeChange: (value: string) => void;
  onSortChange: (value: SortOption) => void;
  onClearFilters: () => void;
}

const SubscriptionFilters: React.FC<SubscriptionFiltersProps> = ({
  searchQuery,
  statusFilter,
  eventTypeFilter,
  sortBy,
  activeFilterCount,
  availableEventTypes,
  onSearchChange,
  onStatusChange,
  onEventTypeChange,
  onSortChange,
  onClearFilters,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow dark:shadow-lg rounded-lg p-4 mb-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase text-gray-500 dark:text-gray-400 tracking-wider">
            Filters
          </span>
          {activeFilterCount > 0 && (
            <Badge className="bg-sentinel text-ghost text-xs px-2 py-0.5 rounded-tech">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-xs border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          >
            <svg 
              className="w-3 h-3 mr-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Search
          </label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="text"
              placeholder="Name or URL..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 font-mono text-sm h-9 border-gray-300 focus:border-sentinel focus:ring-sentinel"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Status
          </label>
          <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
            <SelectTrigger className="h-9 border-gray-300 focus:border-sentinel focus:ring-sentinel">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active
                </span>
              </SelectItem>
              <SelectItem value="inactive">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  Inactive
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Event Type Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Event Type
          </label>
          <Select value={eventTypeFilter} onValueChange={onEventTypeChange}>
            <SelectTrigger className="h-9 border-gray-300 focus:border-sentinel focus:ring-sentinel">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {availableEventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Sort By
          </label>
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger className="h-9 border-gray-300 focus:border-sentinel focus:ring-sentinel">
              <SelectValue placeholder="Default Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Order</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="date-desc">Date (Newest)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest)</SelectItem>
              <SelectItem value="lastWebhook-desc">Last Webhook (Recent)</SelectItem>
              <SelectItem value="lastWebhook-asc">Last Webhook (Oldest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionFilters;

