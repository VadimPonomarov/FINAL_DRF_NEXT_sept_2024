"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeType?: 'percentage' | 'absolute';
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
  className?: string;
  loading?: boolean;
  formatter?: (value: string | number) => string;
  suffix?: string;
  prefix?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  previousValue,
  change,
  changeType = 'percentage',
  trend,
  icon,
  description,
  className,
  loading = false,
  formatter,
  suffix = '',
  prefix = ''
}) => {
  // Автоматически определяем тренд если не указан
  const determinedTrend = trend || (change !== undefined ? 
    (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 
    'neutral'
  );

  const formatValue = (val: string | number) => {
    if (formatter) return formatter(val);
    if (typeof val === 'number') return val.toLocaleString();
    return val;
  };

  const formatChange = (changeValue: number) => {
    const absChange = Math.abs(changeValue);
    if (changeType === 'percentage') {
      return `${absChange.toFixed(1)}%`;
    }
    return absChange.toLocaleString();
  };

  const getTrendIcon = () => {
    switch (determinedTrend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    switch (determinedTrend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getChangeIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <ArrowUp className="h-3 w-3" />;
    if (change < 0) return <ArrowDown className="h-3 w-3" />;
    return null;
  };

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">
            {prefix}{formatValue(value)}{suffix}
          </div>
          <div className={cn("flex items-center text-xs", getTrendColor())}>
            {getTrendIcon()}
          </div>
        </div>
        
        {(change !== undefined || description) && (
          <div className="mt-2 flex items-center justify-between">
            {change !== undefined && (
              <div className={cn(
                "flex items-center text-xs",
                change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-500"
              )}>
                {getChangeIcon()}
                <span className="ml-1">
                  {change > 0 ? '+' : ''}{formatChange(change)}
                </span>
                {previousValue && (
                  <span className="ml-1 text-muted-foreground">
                    от {formatValue(previousValue)}
                  </span>
                )}
              </div>
            )}
            
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KPICard;
