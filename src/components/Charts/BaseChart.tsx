"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface BaseChartProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string;
  height?: number;
}

export const BaseChart: React.FC<BaseChartProps> = ({
  title,
  description,
  children,
  className = '',
  loading = false,
  error,
  height = 300
}) => {
  const content = (
    <div style={{ height }} className="w-full">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full text-red-500">
          <p>{error}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );

  if (title || description) {
    return (
      <Card className={className}>
        <CardHeader>
          {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
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

export default BaseChart;
