"use client";

import React from 'react';

import { Card, CardContent } from '@/components/ui/card';

import { useI18n } from '@/contexts/I18nContext';
import type { ModerationStats as ModerationStatsData } from '@/modules/autoria/moderation/useModerationPageState';

interface ModerationStatsProps {
  stats: ModerationStatsData | null;
}

interface ModerationStatItem {
  value: number;
  color: string;
  label: string;
}

const ModerationStats: React.FC<ModerationStatsProps> = ({ stats }) => {
  const { t } = useI18n();

  if (!stats) return null;

  const items: ModerationStatItem[] = [
    {
      value: stats.total_ads,
      color: 'text-gray-900',
      label: t('autoria.moderation.totalAds')
    },
    {
      value: stats.pending_moderation,
      color: 'text-yellow-600',
      label: t('autoria.moderation.pendingModeration')
    },
    {
      value: stats.needs_review,
      color: 'text-orange-600',
      label: t('autoria.moderation.needsReview')
    },
    {
      value: stats.rejected,
      color: 'text-red-600',
      label: t('autoria.moderation.rejected')
    },
    {
      value: stats.blocked,
      color: 'text-gray-600',
      label: t('autoria.moderation.block')
    },
    {
      value: stats.active,
      color: 'text-green-600',
      label: t('autoria.moderation.active')
    },
    {
      value: stats.today_moderated,
      color: 'text-blue-600',
      label: t('autoria.moderation.todayModerated')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {items.map((item, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <p className="text-xs text-gray-600">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ModerationStats;
