/**
 * Reusable Status Badge component (DRY)
 * Used across all modules for consistent status display
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AdStatus, ModerationStatus } from '../../types';
import styles from './StatusBadge.module.scss';

export interface StatusBadgeProps {
  status: AdStatus | ModerationStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<AdStatus | ModerationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'Active' },
  draft: { variant: 'secondary', label: 'Draft' },
  inactive: { variant: 'secondary', label: 'Inactive' },
  pending: { variant: 'outline', label: 'Pending' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  expired: { variant: 'secondary', label: 'Expired' },
  sold: { variant: 'secondary', label: 'Sold' },
  approved: { variant: 'default', label: 'Approved' },
  needs_review: { variant: 'outline', label: 'Needs Review' }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant} 
      className={styles.statusBadge}
      data-size={size}
    >
      {config.label}
    </Badge>
  );
};
