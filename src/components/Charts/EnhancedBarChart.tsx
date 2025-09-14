"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { BaseChart } from './BaseChart';

interface DataPoint {
  name: string;
  [key: string]: any;
}

interface BarConfig {
  dataKey: string;
  fill: string;
  name: string;
  radius?: [number, number, number, number];
}

interface EnhancedBarChartProps {
  data: DataPoint[];
  title?: string;
  description?: string;
  bars: BarConfig[];
  height?: number;
  layout?: 'horizontal' | 'vertical';
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
  loading?: boolean;
  error?: string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  referenceLines?: Array<{
    y?: number;
    x?: string;
    stroke?: string;
    strokeDasharray?: string;
    label?: string;
  }>;
  maxBarSize?: number;
}

export const EnhancedBarChart: React.FC<EnhancedBarChartProps> = ({
  data,
  title,
  description,
  bars,
  height = 400,
  layout = 'vertical',
  showGrid = true,
  showLegend = true,
  className,
  loading = false,
  error,
  yAxisFormatter,
  tooltipFormatter,
  referenceLines = [],
  maxBarSize = 50
}) => {
  const defaultTooltipFormatter = (value: number, name: string) => {
    const formatted = yAxisFormatter ? yAxisFormatter(value) : value.toLocaleString();
    return [formatted, name];
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
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
        <BarChart 
          data={data} 
          layout={layout}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          maxBarSize={maxBarSize}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="opacity-30"
              stroke="hsl(var(--muted-foreground))"
            />
          )}
          <XAxis 
            type={layout === 'vertical' ? 'category' : 'number'}
            dataKey={layout === 'vertical' ? 'name' : undefined}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={layout === 'horizontal' ? yAxisFormatter : undefined}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            type={layout === 'vertical' ? 'number' : 'category'}
            dataKey={layout === 'horizontal' ? 'name' : undefined}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={layout === 'vertical' ? yAxisFormatter : undefined}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip content={customTooltip} />
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
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
          
          {/* Bars */}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.fill}
              name={bar.name}
              radius={bar.radius || [4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </BaseChart>
  );
};

export default EnhancedBarChart;
