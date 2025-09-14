"use client";

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { BaseChart } from './BaseChart';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface EnhancedPieChartProps {
  data: DataPoint[];
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  className?: string;
  loading?: boolean;
  error?: string;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  valueFormatter?: (value: number) => string;
  showPercentage?: boolean;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export const EnhancedPieChart: React.FC<EnhancedPieChartProps> = ({
  data,
  title,
  description,
  height = 400,
  showLegend = true,
  showLabels = true,
  className,
  loading = false,
  error,
  colors = DEFAULT_COLORS,
  innerRadius = 0,
  outerRadius = 120,
  valueFormatter,
  showPercentage = true
}) => {
  // Вычисляем проценты
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercentages = data.map((item, index) => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
    color: item.color || colors[index % colors.length]
  }));

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <span className="font-medium">{data.name}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Значение: {valueFormatter ? valueFormatter(data.value) : data.value.toLocaleString()}
          </div>
          {showPercentage && (
            <div className="text-sm text-muted-foreground">
              Доля: {data.percentage.toFixed(1)}%
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const renderLabel = (entry: any) => {
    if (!showLabels) return '';
    
    if (showPercentage && entry.percentage > 5) {
      return `${entry.percentage.toFixed(1)}%`;
    } else if (!showPercentage) {
      return entry.name;
    }
    return '';
  };

  const customLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <BaseChart
      title={title}
      description={description}
      className={className}
      loading={loading}
      error={error}
      height={height}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dataWithPercentages}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {dataWithPercentages.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={customTooltip} />
          {showLegend && <Legend content={customLegend} />}
        </PieChart>
      </ResponsiveContainer>
    </BaseChart>
  );
};

export default EnhancedPieChart;
