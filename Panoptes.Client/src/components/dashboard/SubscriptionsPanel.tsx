import { Plus, Terminal, FilterX, Inbox } from 'lucide-react';
import { WebhookSubscription } from '../../types';
import { SubscriptionGrid } from '../SubscriptionGrid';
import { SubscriptionCardSkeleton } from '../SubscriptionCardSkeleton';
import SubscriptionFilters from '../SubscriptionFilters';
import { EmptyState } from '../EmptyState';
import { SUBSCRIPTION_TEMPLATES, SubscriptionTemplate } from '../../config/templates';
import { StatusFilter, SortOption } from '../../hooks/useSubscriptionFilters';

interface SubscriptionsPanelProps {
  subscriptions: WebhookSubscription[];
  filteredSubscriptions: WebhookSubscription[];
  loading: boolean;
  isConfigured: boolean;
  isTourActive: boolean;
  filterProps: {
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
  };
  onCreateClick: () => void;
  onConfigureClick: () => void;
  onSelectSubscription: (sub: WebhookSubscription) => void;
  onTest: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onReset: (id: string) => void;
  onTemplateSelect: (template: SubscriptionTemplate) => void;
}

export function SubscriptionsPanel({
  subscriptions,
  filteredSubscriptions,
  loading,
  isConfigured,
  isTourActive,
  filterProps,
  onCreateClick,
  onConfigureClick,
  onSelectSubscription,
  onTest,
  onEdit,
  onDelete,
  onToggleActive,
  onReset,
  onTemplateSelect
}: SubscriptionsPanelProps) {
  const hasSubscriptions = subscriptions.length > 0;
  const hasFilteredResults = filteredSubscriptions.length > 0;
  const canCreate = isConfigured || isTourActive;

  return (
    <div className="lg:col-span-2 space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-6">
      <PanelHeader
        showButton={hasSubscriptions || loading}
        canCreate={canCreate}
        onCreateClick={onCreateClick}
        onConfigureClick={onConfigureClick}
      />

      {hasSubscriptions && (
        <>
          <div data-tour="filters">
            <SubscriptionFilters
              searchQuery={filterProps.searchQuery}
              statusFilter={filterProps.statusFilter}
              eventTypeFilter={filterProps.eventTypeFilter}
              sortBy={filterProps.sortBy}
              activeFilterCount={filterProps.activeFilterCount}
              availableEventTypes={filterProps.availableEventTypes}
              onSearchChange={filterProps.onSearchChange}
              onStatusChange={filterProps.onStatusChange}
              onEventTypeChange={filterProps.onEventTypeChange}
              onSortChange={filterProps.onSortChange}
              onClearFilters={filterProps.onClearFilters}
            />
          </div>

          <FilterCounter
            filtered={filteredSubscriptions.length}
            total={subscriptions.length}
            hasFilters={filterProps.activeFilterCount > 0}
          />
        </>
      )}

      <ContentArea
        loading={loading}
        hasSubscriptions={hasSubscriptions}
        hasFilteredResults={hasFilteredResults}
        filteredSubscriptions={filteredSubscriptions}
        subscriptions={subscriptions}
        onSelectSubscription={onSelectSubscription}
        onTest={onTest}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
        onReset={onReset}
        onCreateClick={onCreateClick}
        onTemplateSelect={onTemplateSelect}
        onClearFilters={filterProps.onClearFilters}
      />
    </div>
  );
}

interface PanelHeaderProps {
  showButton: boolean;
  canCreate: boolean;
  onCreateClick: () => void;
  onConfigureClick: () => void;
}

function PanelHeader({ showButton, canCreate, onCreateClick, onConfigureClick }: PanelHeaderProps) {
  return (
    <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
      <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-zinc-400" />
        Active_Subscriptions
      </h2>

      {showButton && (
        <button
          onClick={canCreate ? onCreateClick : onConfigureClick}
          data-tour="create-subscription"
          className={`
            flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm
            ${canCreate
              ? 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white dark:border dark:border-emerald-500'
              : 'bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800'
            }
          `}
          title={!canCreate ? 'Click to configure API' : ''}
        >
          <Plus className="w-3.5 h-3.5" />
          {canCreate ? 'New_Subscription' : 'Configure_API'}
        </button>
      )}
    </div>
  );
}

function FilterCounter({ filtered, total, hasFilters }: { filtered: number; total: number; hasFilters: boolean }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
      Showing {filtered} of {total} node{total !== 1 ? 's' : ''}
      {hasFilters && ' (filtered)'}
    </div>
  );
}

interface ContentAreaProps {
  loading: boolean;
  hasSubscriptions: boolean;
  hasFilteredResults: boolean;
  filteredSubscriptions: WebhookSubscription[];
  subscriptions: WebhookSubscription[];
  onSelectSubscription: (sub: WebhookSubscription) => void;
  onTest: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onReset: (id: string) => void;
  onCreateClick: () => void;
  onTemplateSelect: (template: SubscriptionTemplate) => void;
  onClearFilters: () => void;
}

function ContentArea({
  loading,
  hasSubscriptions,
  hasFilteredResults,
  filteredSubscriptions,
  subscriptions,
  onSelectSubscription,
  onTest,
  onEdit,
  onDelete,
  onToggleActive,
  onReset,
  onCreateClick,
  onTemplateSelect,
  onClearFilters
}: ContentAreaProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <SubscriptionCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!hasSubscriptions) {
    return (
      <EmptyState
        icon={Inbox}
        title="No Subscriptions Yet"
        description="Create your first subscription to start monitoring blockchain events. Choose a template below or create a custom one."
        action={{ label: 'Create Subscription', onClick: onCreateClick }}
        secondaryActions={SUBSCRIPTION_TEMPLATES.map(t => ({
          label: t.title,
          onClick: () => onTemplateSelect(t)
        }))}
      />
    );
  }

  if (!hasFilteredResults) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-sm bg-zinc-50/50 dark:bg-black/20">
        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-4">
          <FilterX className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
          No matching nodes
        </h3>
        <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-2 mb-6 text-center max-w-sm">
          ADJUST_SEARCH_PARAMETERS_OR_RESET_FILTERS
        </p>
        <button
          onClick={onClearFilters}
          className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline decoration-dotted underline-offset-4"
        >
          RESET_ALL_FILTERS
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-sm p-4">
      <SubscriptionGrid
        subscriptions={filteredSubscriptions}
        loading={loading}
        onSelectSubscription={onSelectSubscription}
        onTest={onTest}
        onEdit={(id) => {
          const sub = subscriptions.find(s => s.id === id);
          if (sub) onEdit(id);
        }}
        onDelete={(id) => {
          const sub = subscriptions.find(s => s.id === id);
          if (sub) onDelete(id);
        }}
        onToggleActive={onToggleActive}
        onReset={onReset}
      />
    </div>
  );
}
