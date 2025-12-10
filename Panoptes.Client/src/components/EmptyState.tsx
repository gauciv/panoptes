import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryActions?: {
    label: string;
    onClick: () => void;
  }[];
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryActions,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 max-w-2xl mx-auto", className)}>
      <div className="bg-gray-100 p-4 rounded-full mb-6 dark:bg-gray-800">
        <Icon className="w-12 h-12 text-gray-400" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2 dark:text-gray-100">
        {title}
      </h3>
      
      <p className="text-gray-500 mb-8 max-w-md dark:text-gray-400">
        {description}
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {action && (
          <button
            onClick={action.onClick}
            className="w-full px-4 py-2 bg-sentinel text-white rounded-md hover:bg-sentinel-hover transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sentinel"
          >
            {action.label}
          </button>
        )}

        {secondaryActions && secondaryActions.length > 0 && (
          <div className="space-y-2">
            {secondaryActions.map((secondary, index) => (
              <button
                key={index}
                onClick={secondary.onClick}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sentinel dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {secondary.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
