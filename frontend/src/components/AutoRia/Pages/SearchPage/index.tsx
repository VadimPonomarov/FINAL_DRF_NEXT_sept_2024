"use client";

import React from 'react';
import { useTranslation } from '@/contexts/I18nContext';
import { useSearchPageState } from '@/modules/autoria/search/useSearchPageState';
import { SearchFiltersPanel } from '@/components/AutoRia/Search/SearchFiltersPanel';
import { SearchResultsSection } from '@/components/AutoRia/Search/SearchResultsSection';

const SearchViewInternal: React.FC = () => {
  const t = useTranslation();

  const {
    filters,
    quickFilters,
    invertFilters,
    regionId,
    loading,
    paginationLoading,
    totalCount,
    currentPage,
    sortBy,
    sortOrder,
    viewMode,
    activeTab,
    searchResults,
    togglingIds,
    deletingIds,
    setQuickFilters,
    setInvertFilters,
    setRegionId,
    setViewMode,
    setActiveTab,
    updateSearchWithDebounce,
    clearSearchField,
    applyFilters,
    updateFilter,
    clearFilters,
    handlePageChange,
    handleCountersUpdate,
    handleDeleteAd,
    isOwner,
    onSortChange,
    onPageSizeChange,
  } = useSearchPageState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('searchTitle')}</h1>
          <p className="text-slate-600">{t('searchDesc')}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters */}
          <SearchFiltersPanel
            t={t}
            filters={filters}
            quickFilters={quickFilters}
            invertFilters={invertFilters}
            regionId={regionId}
            loading={loading}
            updateSearchWithDebounce={updateSearchWithDebounce}
            clearSearchField={clearSearchField}
            applyFilters={applyFilters}
            updateFilter={updateFilter}
            clearFilters={clearFilters}
            setRegionId={setRegionId}
            setQuickFilters={setQuickFilters}
            setInvertFilters={setInvertFilters}
          />

          {/* Results */}
          <SearchResultsSection
            t={t}
            loading={loading}
            paginationLoading={paginationLoading}
            filters={filters as any}
            searchResults={searchResults}
            totalCount={totalCount}
            currentPage={currentPage}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={onSortChange}
            onPageSizeChange={onPageSizeChange}
            viewMode={viewMode}
            setViewMode={setViewMode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleCountersUpdate={handleCountersUpdate}
            handleDeleteAd={handleDeleteAd}
            isOwner={isOwner}
            togglingIds={togglingIds}
            deletingIds={deletingIds}
            clearFilters={clearFilters}
            handlePageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

const SearchPage: React.FC = () => {
  return <SearchViewInternal />;
};

export default SearchPage;
