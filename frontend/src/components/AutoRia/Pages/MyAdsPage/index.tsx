"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Car, Lock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { useMyAdsPageState } from '@/modules/autoria/my-ads/useMyAdsPageState';
import { MyAdCard } from '../MyAdCard';
import { MyAdsListItem } from '../MyAdsListItem';
import { MyAdsFiltersBar } from '../MyAdsFiltersBar';
import { MyAdsBulkActionsBar } from '../MyAdsBulkActionsBar';

const MyAdsViewInternal: React.FC = () => {
  const { t } = useI18n();
  const {
    authLoading,
    isAuthenticated,
    authError,
    ads,
    loading,
    searchTerm,
    debouncedSearchTerm,
    statusFilter,
    sortBy,
    viewMode,
    selectedIds,
    selectAll,
    ownerEmail,
    formatPrice,
    setSearchTerm,
    setStatusFilter,
    setSortBy,
    setViewMode,
    setSelectedIds,
    setSelectAll,
    getStatusBadge,
    handleCardClick,
    handleOwnerStatusChange,
    bulkUpdateStatus,
    bulkDelete,
    deleteAd,
  } = useMyAdsPageState();

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(ads.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Show loading while checking authorization
  if (authLoading || (loading && !authError)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">
                {authLoading ? 'Checking authorization...' : t('autoria.loadingAds')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Показываем ошибку авторизации
  if (authError || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Lock className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {t('authRequired.title')}
                  </h2>
                  <p className="text-slate-600 mb-6">
                    {authError || t('authRequired.description')}
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link href="/api/auth/signin">
                      <Button className="w-full">
                        <LogIn className="h-4 w-4 mr-2" />
                        {t('authRequired.loginButton')}
                      </Button>
                    </Link>
                    <Link href="/autoria/search">
                      <Button variant="outline" className="w-full">
                        Go to search
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('myAdsTitle')}</h1>
            <p className="text-slate-600">{t('myAdsDesc')}</p>
            <Link href="/autoria/create-ad">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('autoria.createAd')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <MyAdsFiltersBar
          t={t}
          loading={loading}
          searchTerm={searchTerm}
          debouncedSearchTerm={debouncedSearchTerm}
          statusFilter={statusFilter}
          sortBy={sortBy}
          viewMode={viewMode}
          setSearchTerm={setSearchTerm}
          setStatusFilter={setStatusFilter}
          setSortBy={setSortBy}
          setViewMode={setViewMode}
        />

        {/* Results Counter */}
        <MyAdsBulkActionsBar
          t={t}
          loading={loading}
          totalAds={ads.length}
          statusFilter={statusFilter}
          debouncedSearchTerm={debouncedSearchTerm}
          selectAll={selectAll}
          selectedIds={selectedIds}
          setStatusFilter={setStatusFilter}
          setSearchTerm={setSearchTerm}
          bulkUpdateStatus={bulkUpdateStatus}
          bulkDelete={bulkDelete}
          onToggleSelectAll={handleToggleSelectAll}
        />

        {/* Ads List */}
        {ads.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {ads.length === 0 ? t('autoria.noAdsYet') : t('autoria.noAdsFound')}
                </h3>
                <p className="text-slate-600 mb-6">
                  {ads.length === 0
                    ? t('autoria.createFirstAd')
                    : t('autoria.changeSearchParams')
                  }
                </p>
                {ads.length === 0 && (
                  <Link href="/autoria/create-ad">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('autoria.createAd')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <MyAdCard
                key={ad.id}
                ad={ad}
                onClick={handleCardClick}
                onDelete={deleteAd}
                onStatusChange={handleOwnerStatusChange}
                ownerEmail={ownerEmail}
                formatPrice={(a) => formatPrice(a)}
                selected={selectedIds.has(ad.id)}
                onToggleSelected={(id: number, checked: boolean) => setSelectedIds((prev: Set<number>) => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; })}
                viewLabel={t('view')}
                editLabel={t('edit')}
                activateLabel={t('autoria.moderation.activate')}
                hideLabel={t('autoria.hide')}
                archiveLabel={t('autoria.moderation.status.archived')}
                soldLabel={t('autoria.moderation.status.sold')}
                deleteLabel={t('delete')}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <MyAdsListItem
                key={ad.id}
                ad={ad}
                ownerEmail={ownerEmail}
                formatPrice={formatPrice}
                getStatusBadge={getStatusBadge}
                onStatusChange={handleOwnerStatusChange}
                onDelete={deleteAd}
                onClick={handleCardClick}
                selected={selectedIds.has(ad.id)}
                onToggleSelected={(id: number, checked: boolean) =>
                  setSelectedIds((prev: Set<number>) => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; })
                }
                viewLabel={t('view')}
                editLabel={t('edit')}
                activateLabel={t('autoria.moderation.activate')}
                hideLabel={t('autoria.hide')}
                archiveLabel={t('autoria.moderation.status.archived')}
                soldLabel={t('autoria.moderation.status.sold')}
                deleteLabel={t('delete')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MyAdsPage: React.FC = () => {
  return <MyAdsViewInternal />;
};

export default MyAdsPage;
