'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import type { useI18n } from '@/contexts/I18nContext';
import type { UseMyAdsPageStateResult } from '@/modules/autoria/my-ads/myAdsPage.types';

type TFunction = ReturnType<typeof useI18n>['t'];

type BulkState = Pick<
  UseMyAdsPageStateResult,
  'statusFilter' | 'debouncedSearchTerm' | 'selectAll' | 'selectedIds'
>;

type BulkActions = Pick<
  UseMyAdsPageStateResult,
  'setStatusFilter' | 'setSearchTerm' | 'bulkUpdateStatus' | 'bulkDelete'
>;

export interface MyAdsBulkActionsBarProps extends BulkState, BulkActions {
  t: TFunction;
  loading: boolean;
  totalAds: number;
  onToggleSelectAll: (checked: boolean) => void;
}

export const MyAdsBulkActionsBar: React.FC<MyAdsBulkActionsBarProps> = ({
  t,
  loading,
  totalAds,
  statusFilter,
  debouncedSearchTerm,
  selectAll,
  selectedIds,
  setStatusFilter,
  setSearchTerm,
  bulkUpdateStatus,
  bulkDelete,
  onToggleSelectAll,
}) => {
  if (loading) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm text-slate-600">
        {totalAds === 0
          ? 'No ads found'
          : `Found ${totalAds} ad${totalAds === 1 ? '' : 's'}`}
      </p>
      <div className="flex items-center gap-4">
        {(statusFilter !== 'all' || debouncedSearchTerm) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setSearchTerm('');
            }}
            className="text-xs"
          >
            Reset filters
          </Button>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={(e) => {
              const checked = e.target.checked;
              onToggleSelectAll(checked);
            }}
          />
          Select all
        </label>
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                const ids = Array.from(selectedIds);
                await bulkUpdateStatus(ids, 'active');
              }}
            >
              {t('autoria.moderation.status.active')}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const ids = Array.from(selectedIds);
                await bulkUpdateStatus(ids, 'draft');
              }}
            >
              {t('autoria.hide')}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const ids = Array.from(selectedIds);
                await bulkUpdateStatus(ids, 'archived');
              }}
            >
              {t('autoria.moderation.status.archived')}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const ids = Array.from(selectedIds);
                await bulkUpdateStatus(ids, 'sold');
              }}
            >
              {t('autoria.moderation.status.sold')}
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                await bulkDelete(Array.from(selectedIds));
              }}
            >
              {t('delete')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
