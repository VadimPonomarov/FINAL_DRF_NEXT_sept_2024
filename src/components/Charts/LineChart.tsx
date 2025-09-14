"use client";

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

interface LineChartProps {
  data: DataPoint[];
  title?: string;
  description?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  lines?: Array<{
    dataKey: string;
    stroke: string;
    name?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
  formatTooltip?: (value: any, name: string) => [string, string];
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
}

const defaultLines = [
  { dataKey: 'value', stroke: '#3b82f6', name: 'Значение', strokeWidth: 2 }
];

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  description,
  xAxisKey = 'name',
  yAxisKey = 'value',
  lines = defaultLines,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  className = '',
  formatTooltip,
  formatXAxis,
  formatYAxis
}) => {
  const content = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
        <XAxis 
          dataKey={xAxisKey}
          tick={{ fontSize: 12 }}
          tickFormatter={formatXAxis}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={formatYAxis}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px'
            }}
            formatter={formatTooltip}
          />
        )}
        {showLegend && <Legend />}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.stroke}
            strokeWidth={line.strokeWidth || 2}
            strokeDasharray={line.strokeDasharray}
            name={line.name || line.dataKey}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );

  if (title || description) {
    return (
      <Card className={className}>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
};

export default LineChart;
