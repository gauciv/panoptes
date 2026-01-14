import { ArrowLeft, Zap, Edit2, Pause, Play, Settings, Trash2 } from 'lucide-react';
import { WebhookSubscription } from '../../types';

interface DetailHeaderProps {
  subscription: WebhookSubscription;
  onBack: () => void;
  onTest: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onConfig: () => void;
  onDelete: () => void;
}

export function DetailHeader({
  subscription,
  onBack,
  onTest,
  onEdit,
  onToggleActive,
  onConfig,
  onDelete
}: DetailHeaderProps) {
  return (
    <>
      <BackButton onClick={onBack} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SubscriptionInfo subscription={subscription} />
        <ActionButtons
          isActive={subscription.isActive}
          onTest={onTest}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
          onConfig={onConfig}
          onDelete={onDelete}
        />
      </div>
    </>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <div>
      <button
        onClick={onClick}
        className="p-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm transition-colors text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
    </div>
  );
}

function SubscriptionInfo({ subscription }: { subscription: WebhookSubscription }) {
  return (
    <div className="flex items-center gap-3 w-full md:w-auto">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight break-all mr-2">
            {subscription.name}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge isActive={subscription.isActive} />
            <IdBadge id={subscription.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  const colorClasses = isActive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';

  return (
    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wide border ${colorClasses}`}>
      {isActive ? 'OP:RUNNING' : 'OP:PAUSED'}
    </span>
  );
}

function IdBadge({ id }: { id: string }) {
  return (
    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-1.5 rounded-sm">
      {id}
    </span>
  );
}

interface ActionButtonsProps {
  isActive: boolean;
  onTest: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onConfig: () => void;
  onDelete: () => void;
}

function ActionButtons({ isActive, onTest, onEdit, onToggleActive, onConfig, onDelete }: ActionButtonsProps) {
  const buttonBase = 'flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none transition-all';

  return (
    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
      <button onClick={onTest} className={`${buttonBase} text-zinc-700 dark:text-zinc-300`}>
        <Zap className="w-3.5 h-3.5 text-indigo-500" />
        Test
      </button>

      <button onClick={onEdit} className={`${buttonBase} text-zinc-700 dark:text-zinc-300`}>
        <Edit2 className="w-3.5 h-3.5" />
        Edit
      </button>

      <button onClick={onToggleActive} className={`${buttonBase} text-zinc-700 dark:text-zinc-300`}>
        {isActive ? (
          <Pause className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <Play className="w-3.5 h-3.5 text-emerald-500" />
        )}
        {isActive ? 'Pause' : 'Resume'}
      </button>

      <button onClick={onConfig} className={`${buttonBase} text-zinc-700 dark:text-zinc-300`}>
        <Settings className="w-3.5 h-3.5" />
        Config
      </button>

      <button
        onClick={onDelete}
        className={`col-span-2 sm:col-span-1 ${buttonBase} text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20`}
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  );
}
