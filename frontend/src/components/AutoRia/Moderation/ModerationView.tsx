"use client";

import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Shield, Search, Filter, AlertTriangle, Grid, List } from 'lucide-react';

import { useI18n } from '@/contexts/I18nContext';
import { useModerationPageState } from '@/modules/autoria/moderation/useModerationPageState';

import ModerationHeader from '@/components/AutoRia/Moderation/ModerationHeader';
import ModerationStats from '@/components/AutoRia/Moderation/ModerationStats';
import AdCard from '@/components/AutoRia/Moderation/AdCard';
import AdTableRow from '@/components/AutoRia/Moderation/AdTableRow';
import AdDetailsModal from '@/components/AutoRia/Moderation/AdDetailsModal';

const ModerationView: React.FC = () => {
  const { t } = useI18n();
  const {
    user,
    isAuthenticated,
    authLoading,
    userProfileData,
    isSuperUser,
    ads,
    loading,
    stats,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    targetCurrency,
    setTargetCurrency,
    selectedAd,
    handleViewAd,
    handleCloseModal,
    selectedIds,
    setSelectedIds,
    selectAll,
    setSelectAll,
    formatPrice,
    loadModerationQueue,
    loadModerationStats,
    handleStatusChange,
    handleDeleteAd,
    handleSaveModerationNotes,
    moderateAd,
    bulkModerate,
    bulkDelete,
  } = useModerationPageState();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200">
            ⏳ {t('autoria.moderation.status.pending')}
          </Badge>
        );
      case 'needs_review':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200">
            🔍 {t('autoria.moderation.status.needsReview')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200">
            ❌ {t('autoria.moderation.status.rejected')}
          </Badge>
        );
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
            ✅ {t('autoria.moderation.status.active')}
          </Badge>
        );
      case 'blocked':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200">
            🚫 {t('autoria.moderation.status.blocked')}
          </Badge>
        );
      case 'draft':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200">
            📝 {t('autoria.moderation.status.draft')}
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200">
            📦 {t('autoria.moderation.status.archived')}
          </Badge>
        );
      case 'sold':
        return (
          <Badge className="bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-200">
            💰 {t('autoria.moderation.status.sold')}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200">
            {status}
          </Badge>
        );
    }
  };

  if (!isSuperUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('accessDenied.superuserRequired')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <ModerationHeader
          userEmail={user?.email || null}
          isSuperUser={isSuperUser}
          isAuthenticated={isAuthenticated}
          authLoading={authLoading}
          isProfileSuperUser={Boolean(userProfileData?.user?.is_superuser)}
        />

        <ModerationStats stats={stats} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('autoria.moderation.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder={t('autoria.moderation.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📋 {t('autoria.moderation.allStatuses')}</SelectItem>
                  <SelectItem value="active">✅ {t('autoria.moderation.status.active')}</SelectItem>
                  <SelectItem value="pending">⏳ {t('autoria.moderation.status.pending')}</SelectItem>
                  <SelectItem value="draft">📝 {t('autoria.moderation.status.draft')}</SelectItem>
                  <SelectItem value="needs_review">🔍 {t('autoria.moderation.status.needsReview')}</SelectItem>
                  <SelectItem value="rejected">❌ {t('autoria.moderation.status.rejected')}</SelectItem>
                  <SelectItem value="blocked">🚫 {t('autoria.moderation.status.blocked')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  void loadModerationQueue();
                  void loadModerationStats();
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {t('autoria.moderation.refresh')}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">{t('autoria.moderation.sortBy')}:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">{t('autoria.moderation.createdAt')}</SelectItem>
                    <SelectItem value="title">{t('title')}</SelectItem>
                    <SelectItem value="price">{t('autoria.moderation.price')}</SelectItem>
                    <SelectItem value="status">{t('autoria.moderation.status')}</SelectItem>
                    <SelectItem value="brand">{t('autoria.moderation.brand')}</SelectItem>
                    <SelectItem value="year">{t('autoria.moderation.year')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>

              <Select value={targetCurrency} onValueChange={(v) => setTargetCurrency(v as any)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAH">₴ UAH</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">{t('autoria.moderation.view')}:</span>
                <div className="flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <span className="ml-4">{t('autoria.moderation.loadingModeration')}</span>
          </div>
        ) : ads.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('autoria.moderation.noAdsFound')}
                </h3>
                <p className="text-gray-600">
                  {t('autoria.moderation.noAdsDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ads.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                onStatusChange={handleStatusChange}
                onModerate={moderateAd}
                onDelete={handleDeleteAd}
                onView={handleViewAd}
                formatPrice={formatPrice}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectAll(checked);
                          if (checked) setSelectedIds(new Set(ads.map((a) => a.id)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead className="min-w-[200px]">{t('title')}</TableHead>
                    <TableHead className="w-32">
                      {t('autoria.moderation.brand')}/{t('autoria.moderation.model')}
                    </TableHead>
                    <TableHead className="w-24">{t('autoria.moderation.year')}</TableHead>
                    <TableHead className="w-24">{t('autoria.moderation.price')}</TableHead>
                    <TableHead className="w-32">{t('autoria.moderation.status')}</TableHead>
                    <TableHead className="w-40">{t('autoria.moderation.user')}</TableHead>
                    <TableHead className="w-32">{t('autoria.moderation.created')}</TableHead>
                    <TableHead className="w-48">{t('autoria.moderation.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map((ad) => (
                    <React.Fragment key={ad.id}>
                      <TableRow className="hidden" />
                      <TableRow>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ad.id)}
                            onChange={(e) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(ad.id);
                                else next.delete(ad.id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <AdTableRow
                          ad={ad}
                          onStatusChange={handleStatusChange}
                          onModerate={moderateAd}
                          onDelete={handleDeleteAd}
                          onView={handleViewAd}
                          formatPrice={formatPrice}
                          getStatusBadge={getStatusBadge}
                        />
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-2 items-center p-4 border-t bg-gray-50">
              <span className="text-sm text-gray-600 mr-2">
                {t('autoria.moderation.selected') || 'Вибрано'}: {selectedIds.size}
              </span>
              <Button
                size="icon"
                title={t('autoria.moderation.approve')}
                onClick={() => void bulkModerate('approve')}
                disabled={selectedIds.size === 0}
              >
                ✅
              </Button>
              <Button
                size="icon"
                variant="outline"
                title={t('autoria.moderation.review')}
                onClick={() => void bulkModerate('review')}
                disabled={selectedIds.size === 0}
              >
                🔄
              </Button>
              <Button
                size="icon"
                variant="destructive"
                title={t('autoria.moderation.reject')}
                onClick={() => void bulkModerate('reject')}
                disabled={selectedIds.size === 0}
              >
                ❌
              </Button>
              <Button
                size="icon"
                variant="outline"
                title={t('autoria.moderation.block')}
                onClick={() => void bulkModerate('block')}
                disabled={selectedIds.size === 0}
              >
                🚫
              </Button>
              <Button
                size="icon"
                variant="outline"
                title={t('autoria.moderation.activate')}
                onClick={() => void bulkModerate('activate')}
                disabled={selectedIds.size === 0}
              >
                ✅
              </Button>
              <Button
                size="icon"
                variant="destructive"
                title={t('common.delete')}
                onClick={() => void bulkDelete()}
                disabled={selectedIds.size === 0}
              >
                🗑️
              </Button>
            </div>
          </Card>
        )}

        <AdDetailsModal
          ad={selectedAd}
          isOpen={!!selectedAd}
          onClose={handleCloseModal}
          formatPrice={formatPrice}
          getStatusBadge={getStatusBadge}
          onSaveNotes={handleSaveModerationNotes}
        />
      </div>
    </div>
  );
};

export default ModerationView;
