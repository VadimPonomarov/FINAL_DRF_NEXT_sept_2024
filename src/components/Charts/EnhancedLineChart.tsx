"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { BaseChart } from './BaseChart';
import { format } from 'date-fns';
import { ru, uk, enUS } from 'date-fns/locale';

interface DataPoint {
  date: string;
  value: number;
  predicted?: boolean;
  [key: string]: any;
}

interface LineConfig {
  dataKey: string;
  stroke: string;
  name: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  dot?: boolean;
}

interface EnhancedLineChartProps {
  data: DataPoint[];
  title?: string;
  description?: string;
  lines: LineConfig[];
  height?: number;
  showBrush?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
  loading?: boolean;
  error?: string;
  locale?: 'ru' | 'uk' | 'en';
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  referenceLines?: Array<{
    y?: number;
    x?: string;
    stroke?: string;
    strokeDasharray?: string;
    label?: string;
  }>;
}

const localeMap = {
  ru: ru,
  uk: ru, // Используем русскую локаль для украинского
  en: enUS
};

export const EnhancedLineChart: React.FC<EnhancedLineChartProps> = ({
  data,
  title,
  description,
  lines,
  height = 400,
  showBrush = false,
  showGrid = true,
  showLegend = true,
  className,
  loading = false,
  error,
  locale = 'ru',
  yAxisFormatter,
  tooltipFormatter,
  referenceLines = []
}) => {
  const formatXAxisDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'dd MMM', { locale: localeMap[locale] });
    } catch {
      return dateStr;
    }
  };

  const defaultTooltipFormatter = (value: number, name: string) => {
    const formatted = yAxisFormatter ? yAxisFormatter(value) : value.toLocaleString();
    return [formatted, name];
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{formatXAxisDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm">
                {entry.name}: {tooltipFormatter ? 
                  tooltipFormatter(entry.value, entry.name)[0] : 
                  defaultTooltipFormatter(entry.value, entry.name)[0]
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
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
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="opacity-30" 
              stroke="hsl(var(--muted-foreground))"
            />
          )}
          <XAxis 
            dataKey="date"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={formatXAxisDate}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={yAxisFormatter}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip content={customTooltip} />
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
          )}
          
          {/* Reference lines */}
          {referenceLines.map((refLine, index) => (
            <ReferenceLine
              key={index}
              y={refLine.y}
              x={refLine.x}
              stroke={refLine.stroke || 'hsl(var(--muted-foreground))'}
              strokeDasharray={refLine.strokeDasharray || '5 5'}
              label={refLine.label}
            />
          ))}
          
          {/* Lines */}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth || 2}
              strokeDasharray={line.strokeDasharray}
              name={line.name}
              dot={line.dot !== false ? { r: 3, strokeWidth: 2 } : false}
              activeDot={{ r: 5, strokeWidth: 2 }}
              connectNulls={false}
            />
          ))}
          
          {/* Brush for zooming */}
          {showBrush && (
            <Brush 
              dataKey="date" 
              height={30}
              stroke="hsl(var(--primary))"
              tickFormatter={formatXAxisDate}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </BaseChart>
  );
};

export default EnhancedLineChart;
