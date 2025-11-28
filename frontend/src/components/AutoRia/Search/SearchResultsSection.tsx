"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencySelector } from "@/components/AutoRia/CurrencySelector/CurrencySelector";
import { Search, Grid, List } from "lucide-react";
import AnalyticsTabContent from "@/components/AutoRia/Analytics/AnalyticsTabContent";
import CarAdCard from "@/components/AutoRia/Components/CarAdCard";
import CarAdListItem from "@/components/AutoRia/Components/CarAdListItem";
import type { CarAd } from "@/modules/autoria/shared/types/autoria";
import type { SearchFiltersState } from "@/modules/autoria/search/useSearchPageState";

interface SearchResultsSectionProps {
  t: (key: string, fallback?: string) => string;
  loading: boolean;
  paginationLoading: boolean;
  filters: SearchFiltersState;
  searchResults: CarAd[];
  totalCount: number;
  currentPage: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (field: string, order: "asc" | "desc") => void;
  onPageSizeChange: (pageSize: number) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  activeTab: "results" | "analytics";
  setActiveTab: (tab: "results" | "analytics") => void;
  handleCountersUpdate: (adId: number, counters: { favorites_count: number; phone_views_count: number }) => void;
  handleDeleteAd: (adId: number, event?: React.MouseEvent) => void | Promise<void>;
  isOwner: (car: CarAd) => boolean;
  togglingIds: Set<number>;
  deletingIds: Set<number>;
  clearFilters: () => void;
  handlePageChange: (page: number) => void;
}

export const SearchResultsSection: React.FC<SearchResultsSectionProps> = ({
  t,
  loading,
  paginationLoading,
  filters,
  searchResults,
  totalCount,
  currentPage,
  sortBy,
  sortOrder,
  onSortChange,
  onPageSizeChange,
  viewMode,
  setViewMode,
  activeTab,
  setActiveTab,
  handleCountersUpdate,
  handleDeleteAd,
  isOwner,
  togglingIds,
  deletingIds,
  clearFilters,
  handlePageChange,
}) => {
  return (
    <div className="flex-1">
      {/* Results header */}
      <div className="mb-6">
        {/* Responsive toolbar */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-[200px]">
              <h2 className="text-xl font-semibold">
                {loading ? t("common.loading") : `${t("common.found")}: ${totalCount}`}
              </h2>
              {!loading && totalCount > 0 && (
                <p className="text-sm text-slate-600">
                  {filters.page_size === 0
                    ? `${totalCount} ${t("autoria.total", "total")}`
                    : `${searchResults.length} / ${totalCount} • ${t("page", "Page")} ${currentPage} ${t(
                        "autoria.of",
                        "of",
                      )} ${Math.ceil(totalCount / filters.page_size)}`}
                </p>
              )}
            </div>

            {/* Tabs: Results / Analytics */}
            {!loading && totalCount > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => {
                      if (v === "results" || v === "analytics") {
                        setActiveTab(v);
                      }
                    }}
                    className="flex-1"
                  >
                    <TabsList>
                      <TabsTrigger value="results">{t("searchResults")}</TabsTrigger>
                      <TabsTrigger value="analytics">{t("analytics")}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="results">
                      {/* Results content will be rendered below */}
                    </TabsContent>
                    <TabsContent value="analytics">
                      <AnalyticsTabContent filters={filters} results={searchResults} loading={loading} />
                    </TabsContent>
                  </Tabs>

                  {/* Currency Selector - always visible */}
                  <CurrencySelector showLabel={true} />
                </div>
              </div>
            )}

            {activeTab === "results" && !loading && searchResults.length > 0 && (
              <div className="flex-1 flex flex-wrap gap-3 items-center">
                {/* Sort (combined) */}
                <div className="flex items-center gap-2 min-w-[200px] flex-1">
                  <span className="text-sm text-slate-600 whitespace-nowrap">
                    {t("common.sort") || "Sort"}:
                  </span>
                  <select
                    value={`${sortBy}_${sortOrder}`}
                    onChange={(e) => {
                      const val = e.target.value as string;
                      const [field, dir] = val.split("_");
                      onSortChange(field, (dir as "asc" | "desc") || "desc");
                    }}
                    className="text-sm border border-gray-300 rounded px-2 py-1 flex-1 min-w-0"
                  >
                    <option value="created_at_desc">{t("autoria.byDate") || "By date"} ↓</option>
                    <option value="created_at_asc">{t("autoria.byDate") || "By date"} ↑</option>
                    <option value="price_desc">{t("autoria.byPrice") || "By price"} ↓</option>
                    <option value="price_asc">{t("autoria.byPrice") || "By price"} ↑</option>
                    <option value="year_desc">{t("autoria.byYear") || "By year"} ↓</option>
                    <option value="year_asc">{t("autoria.byYear") || "By year"} ↑</option>
                    <option value="mileage_desc">{t("autoria.byMileage") || "By mileage"} ↓</option>
                    <option value="mileage_asc">{t("autoria.byMileage") || "By mileage"} ↑</option>
                    <option value="title_asc">{t("autoria.byTitle") || "By title"} A→Z</option>
                  </select>
                </div>

                {/* Per page */}
                <div className="flex items-center gap-2 min-w-[140px]">
                  <span className="text-sm text-slate-600 whitespace-nowrap">
                    {t("autoria.perPage") || "Per page"}:
                  </span>
                  <select
                    value={filters.page_size === 0 ? "all" : String(filters.page_size)}
                    onChange={(e) => {
                      const val = e.target.value === "all" ? 0 : parseInt(e.target.value, 10);
                      console.log("📄 Page size changed to:", val);
                      const newPageSize = Number.isNaN(val) ? 20 : val;
                      onPageSizeChange(newPageSize);
                    }}
                    className="text-sm border border-gray-300 rounded px-2 py-1 w-[80px]"
                  >
                    <option value="all">{t("autoria.all") || "All"}</option>
                    <option value={1}>1</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>

                {/* View mode */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 hidden sm:inline">
                    {t("autoria.view") || "View"}:
                  </span>
                  <div className="flex border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 ${
                        viewMode === "grid"
                          ? "bg-blue-500 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 ${
                        viewMode === "list"
                          ? "bg-blue-500 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {activeTab === "results" && (
        loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4">{t("common.loading")}</span>
          </div>
        ) : searchResults.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {t("autoria.noAdsFound") || t("common.none")}
                </h3>
                <p className="text-slate-600 mb-6">
                  {t("autoria.tryAdjustFilters") || t("common.search")}
                </p>
                <Button onClick={clearFilters}>{t("common.clear")}</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div
            className={`${
              viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-3"
            } transition-opacity duration-300 ${
              paginationLoading ? "opacity-50" : "opacity-100"
            }`}
          >
            {searchResults.map((car) =>
              viewMode === "grid" ? (
                <CarAdCard key={car.id} ad={car} onCountersUpdate={handleCountersUpdate} />
              ) : (
                <CarAdListItem
                  key={car.id}
                  ad={car}
                  onCountersUpdate={handleCountersUpdate}
                  onDelete={handleDeleteAd}
                  isOwner={isOwner}
                  togglingIds={togglingIds}
                  deletingIds={deletingIds}
                />
              ),
            )}
          </div>
        )
      )}

      {/* Pagination */}
      {activeTab === "results" &&
        !loading &&
        searchResults.length > 0 &&
        filters.page_size !== 0 &&
        totalCount > filters.page_size && (
          <div className="flex justify-center items-center gap-4 mt-8 mb-4">
            <Button
              variant="outline"
              onClick={() => {
                if (currentPage > 1) {
                  handlePageChange(currentPage - 1);
                }
              }}
              disabled={currentPage <= 1 || paginationLoading}
              className="flex items-center gap-2"
            >
              {paginationLoading ? "⏳" : "←"} {t("autoria.prev") || "Prev"}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">
                {t("page", "Page")} {currentPage} / {" "}
                {filters.page_size === 0 ? 1 : Math.ceil(totalCount / filters.page_size)}
              </span>
              {paginationLoading && (
                <span className="text-xs text-blue-500 animate-pulse">
                  {t("loading.pleaseWait")}
                </span>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => {
                if (filters.page_size !== 0 && currentPage < Math.ceil(totalCount / filters.page_size)) {
                  handlePageChange(currentPage + 1);
                }
              }}
              disabled={
                filters.page_size === 0 ||
                currentPage >= Math.ceil(totalCount / filters.page_size) ||
                paginationLoading
              }
              className="flex items-center gap-2"
            >
              {t("autoria.next") || "Next"} {paginationLoading ? "⏳" : "→"}
            </Button>
          </div>
        )}
    </div>
  );
};
