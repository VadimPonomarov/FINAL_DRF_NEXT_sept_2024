'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Grid, List } from 'lucide-react';
import { CurrencySelector } from '@/components/AutoRia/CurrencySelector/CurrencySelector';
import type { useI18n } from '@/contexts/I18nContext';
import type { UseMyAdsPageStateResult } from '@/modules/autoria/my-ads/myAdsPage.types';

type TFunction = ReturnType<typeof useI18n>['t'];

type FiltersState = Pick<
  UseMyAdsPageStateResult,
  'searchTerm' | 'debouncedSearchTerm' | 'statusFilter' | 'sortBy' | 'viewMode'
>;

type FiltersActions = Pick<
  UseMyAdsPageStateResult,
  'setSearchTerm' | 'setStatusFilter' | 'setSortBy' | 'setViewMode'
>;

export interface MyAdsFiltersBarProps extends FiltersState, FiltersActions {
  t: TFunction;
  loading: boolean;
}

export const MyAdsFiltersBar: React.FC<MyAdsFiltersBarProps> = ({
  t,
  loading,
  searchTerm,
  debouncedSearchTerm,
  statusFilter,
  sortBy,
  viewMode,
  setSearchTerm,
  setStatusFilter,
  setSortBy,
  setViewMode,
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder={t('autoria.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {loading && debouncedSearchTerm !== searchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
          {/* Currency selector */}
          <div className="w-full sm:w-auto">
            <CurrencySelector className="w-full" showLabel={false} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('autoria.statusFilter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('autoria.moderation.allStatuses')}</SelectItem>
              <SelectItem value="draft">{t('autoria.moderation.status.draft')}</SelectItem>
              <SelectItem value="pending">{t('autoria.moderation.status.pending')}</SelectItem>
              <SelectItem value="needs_review">{t('autoria.moderation.status.needsReview')}</SelectItem>
              <SelectItem value="active">{t('autoria.moderation.status.active')}</SelectItem>
              <SelectItem value="rejected">{t('autoria.moderation.status.rejected')}</SelectItem>
              <SelectItem value="blocked">{t('autoria.moderation.status.blocked')}</SelectItem>
              <SelectItem value="sold">{t('autoria.moderation.status.sold')}</SelectItem>
              <SelectItem value="archived">{t('autoria.moderation.status.archived')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('autoria.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">{t('autoria.newest')}</SelectItem>
              <SelectItem value="created_asc">{t('autoria.oldest')}</SelectItem>
              <SelectItem value="price_desc">{t('autoria.priceHigh')}</SelectItem>
              <SelectItem value="price_asc">{t('autoria.priceLow')}</SelectItem>
              <SelectItem value="views_desc">{t('autoria.byViews')}</SelectItem>
              <SelectItem value="title_asc">By title (A–Z)</SelectItem>
              <SelectItem value="title_desc">By title (Z–A)</SelectItem>
              <SelectItem value="status_asc">{t('autoria.moderation.status')}</SelectItem>
              <SelectItem value="status_desc">{t('autoria.moderation.status')} ↓</SelectItem>
            </SelectContent>
          </Select>
          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
