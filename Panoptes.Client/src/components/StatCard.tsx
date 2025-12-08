import React, { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    variant?: 'default' | 'dark';
}

const StatCard: React.FC<StatCardProps> = ({ 
    title, 
    value, 
    icon, 
    subtitle,
    trend,
    trendValue,
    variant = 'default'
}) => {
    const isDark = variant === 'dark';
    
    return (
        <div className={`rounded-lg shadow p-6 flex items-center space-x-4 border transition-colors ${
            isDark 
                ? 'bg-void border-ghost/15 hover:border-sentinel' 
                : 'bg-white border-gray-200 hover:border-sentinel'
        }`}>
            <div className={`p-3 rounded-tech ${
                isDark 
                    ? 'bg-sentinel/20 text-sentinel' 
                    : 'bg-sentinel/10 text-sentinel'
            }`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-mono text-xs uppercase tracking-wider ${
                    isDark ? 'text-ghost/60' : 'text-gray-500'
                }`}>
                    {title}
                </p>
                <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-semibold font-mono tabular-nums ${
                        isDark ? 'text-ghost' : 'text-gray-900'
                    }`}>
                        {value}
                    </p>
                    {trend && trendValue && (
                        <span className={`text-xs font-mono flex items-center gap-0.5 ${
                            trend === 'up' 
                                ? 'text-green-500' 
                                : trend === 'down' 
                                    ? 'text-red-500' 
                                    : isDark ? 'text-ghost/40' : 'text-gray-400'
                        }`}>
                            {trend === 'up' && '↑'}
                            {trend === 'down' && '↓'}
                            {trendValue}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className={`text-xs mt-1 ${
                        isDark ? 'text-ghost/40' : 'text-gray-400'
                    }`}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
};

export default StatCard;
