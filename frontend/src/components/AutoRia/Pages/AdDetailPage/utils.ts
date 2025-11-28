import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type StatusConfig = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: typeof CheckCircle;
};

export const getStatusConfig = (status: string): StatusConfig => {
  const statusConfigs: Record<string, StatusConfig> = {
    active: { 
      label: 'Активное',
      variant: 'default', 
      icon: CheckCircle 
    },
    pending: { 
      label: 'На модерации',
      variant: 'secondary', 
      icon: Clock 
    },
    rejected: { 
      label: 'Отклонено',
      variant: 'destructive', 
      icon: AlertCircle 
    },
    draft: { 
      label: 'Черновик',
      variant: 'outline', 
      icon: Clock 
    },
    requires_verification: {
      label: 'Требует проверки',
      variant: 'secondary',
      icon: AlertCircle,
    },
  };
  
  return statusConfigs[status] || { 
    label: status, 
    variant: 'outline', 
    icon: AlertCircle 
  };
};

export const getStatusLabel = (status: string, t: (key: string, defaultValue?: string) => string): string => {
  const config = getStatusConfig(status);
  
  // First try with the full path, then with just the status
  let translatedLabel = t(`autoria.moderation.status.${status}`, '');
  if (!translatedLabel) {
    translatedLabel = t(status, config.label);
  }
  
  // Fallback to the status if no translation found
  if (translatedLabel === status) {
    translatedLabel = config.label || status;
  }

  return translatedLabel;
};

export const getStatusBadge = (
  status: string,
  t: (key: string, defaultValue?: string) => string
): React.ReactNode => {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  const label = getStatusLabel(status, t);

  return React.createElement(
    Badge,
    { variant: config.variant, className: 'flex items-center gap-1' },
    React.createElement(Icon, { className: 'h-3 w-3' }),
    label,
  );
};
