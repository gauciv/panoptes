import React, { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    alertColor?: string; // Optional: Pass 'bg-red-50 border-red-200' for critical errors
}

const StatCard: React.FC<StatCardProps> = ({ 
    title, 
    value, 
    icon, 
    subtitle,
    trend,
    trendValue,
    alertColor
}) => {
    return (
        <div className={`
            relative overflow-hidden group
            /* SHAPE & BORDER */
            rounded-sm border transition-all duration-200
            
            /* LIGHT MODE COLORS */
            bg-white border-zinc-300 hover:border-zinc-400
            shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)]
            
            /* DARK MODE COLORS */
            dark:bg-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-500
            dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]
            
            /* MOBILE LAYOUT PROTECTION */
            min-w-[140px] flex flex-col justify-between
            
            /* ALERT OVERRIDE (If provided) */
            ${alertColor || ''}
        `}>
            {/* Left Status Strip (Visual Indicator) */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                trend === 'up' ? 'bg-emerald-500' : 
                trend === 'down' ? 'bg-rose-500' : 
                'bg-transparent group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600'
            }`} />

            <div className="p-4 flex flex-col h-full gap-3">
                {/* Header: Title & Icon */}
                <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 truncate pr-2">
                        {title}
                    </span>
                    <div className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                        {icon}
                    </div>
                </div>

                {/* Main Value */}
                <div className="mt-auto">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
                            {value}
                        </span>
                    </div>

                    {/* Footer: Trend or Subtitle */}
                    {(trend || subtitle) && (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {trend && trendValue && (
                                <span className={`
                                    inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase
                                    ${trend === 'up' 
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                    }
                                `}>
                                    {trend === 'up' ? '▲' : '▼'} {trendValue}
                                </span>
                            )}
                            
                            {subtitle && (
                                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
                                    {subtitle}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatCard;