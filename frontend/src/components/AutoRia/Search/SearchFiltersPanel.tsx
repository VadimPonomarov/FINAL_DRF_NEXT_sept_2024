"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VirtualSelect } from "@/components/ui/virtual-select";
import { Search } from "lucide-react";
import { cachedFetch } from "@/modules/autoria/shared/utils/cachedFetch";
import type { SearchFiltersState, SearchQuickFiltersState } from "@/modules/autoria/search/useSearchPageState";

interface SearchFiltersPanelProps {
  t: (key: string, fallback?: string) => string;
  filters: SearchFiltersState;
  quickFilters: SearchQuickFiltersState;
  invertFilters: boolean;
  regionId: string;
  loading: boolean;
  updateSearchWithDebounce: (value: string) => void;
  clearSearchField: () => void;
  applyFilters: () => void;
  updateFilter: (key: keyof Omit<SearchFiltersState, "page_size">, value: string) => void;
  clearFilters: () => void;
  setRegionId: (value: string) => void;
  setQuickFilters: React.Dispatch<React.SetStateAction<SearchQuickFiltersState>>;
  setInvertFilters: (value: boolean) => void;
}

export const SearchFiltersPanel: React.FC<SearchFiltersPanelProps> = ({
  t,
  filters,
  quickFilters,
  invertFilters,
  regionId,
  loading,
  updateSearchWithDebounce,
  clearSearchField,
  applyFilters,
  updateFilter,
  clearFilters,
  setRegionId,
  setQuickFilters,
  setInvertFilters,
}) => {
  return (
    <div className="lg:w-80">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t("searchFilters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Text search */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("search")}</label>
            <div className="flex gap-2">
              <Input
                placeholder={t("enterBrandModel")}
                value={filters.search}
                onChange={(e) => updateSearchWithDebounce(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={clearSearchField}
                disabled={!filters.search}
                className="px-3"
                title="Clear search"
              >
                ×
              </Button>
            </div>
            {filters.search && (
              <p className="text-xs text-slate-500 mt-1">
                {t("autoria.searchAutoApplyNotice") ||
                  t("searchAutoApplyNotice") ||
                  "Search is automatically applied after 0.8 seconds"}
              </p>
            )}
          </div>

          {/* Vehicle type */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("vehicleType")}</label>
            <VirtualSelect
              placeholder={t("selectVehicleType")}
              value={filters.vehicle_type}
              onValueChange={(value) => updateFilter("vehicle_type", value || "")}
              fetchOptions={async (search) => {
                console.log("🔍 Fetching vehicle types with search:", search);
                const params = new URLSearchParams();
                if (search) params.append("search", search);
                const response = await fetch(`/api/public/reference/vehicle-types?${params}`);
                const data = await response.json();
                console.log("🔍 Vehicle types response:", data);

                // API returns an object with an options field
                return data.options || [];
              }}
              allowClear={true}
              searchable={true}
            />
          </div>

          {/* Brand */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("brand")}</label>
            <VirtualSelect
              placeholder={t("selectBrand")}
              value={filters.brand}
              onValueChange={(value) => {
                console.log("🔍 Brand selected:", value);
                updateFilter("brand", value || "");
                // Reset model when brand changes
                if (filters.model) {
                  updateFilter("model", "");
                }
              }}
              fetchOptions={async (search) => {
                console.log("🔍 Fetching brands with search:", search);
                console.log("🔍 Current vehicle_type:", filters.vehicle_type);

                // ✅ CASCADE FILTERING: if vehicle type is not selected, return an empty array
                if (!filters.vehicle_type) {
                  console.log("🔍 ❌ No vehicle_type selected, returning empty array");
                  return [];
                }

                const params = new URLSearchParams();
                if (search) params.append("search", search);
                params.append("vehicle_type_id", filters.vehicle_type);
                params.append("page_size", "1000"); // Load all data
                console.log("🔍 ✅ Fetching brands for vehicle_type:", filters.vehicle_type);

                const response = await fetch(`/api/public/reference/brands?${params}`);
                const data = await response.json();
                console.log("🔍 Brands response count:", data.options?.length || 0);
                return data.options || [];
              }}
              allowClear={true}
              searchable={true}
              disabled={!filters.vehicle_type}
              dependencies={[filters.vehicle_type]} // Reload when vehicle type changes
            />
            {!filters.vehicle_type && (
              <p className="text-xs text-slate-500 mt-1">
                {t("selectVehicleTypeFirst")}
              </p>
            )}
          </div>

          {/* Condition (new/used) */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("autoria.condition") || "Condition"}</label>
            <VirtualSelect
              placeholder={t("autoria.selectCondition") || "Select condition"}
              value={filters.condition}
              onValueChange={(value) => updateFilter("condition", value || "")}
              fetchOptions={async () => {
                // Simple static options, similar to a regular select
                return [
                  { value: "new", label: t("autoria.new") || "New" },
                  { value: "used", label: t("autoria.used") || "Used" },
                ];
              }}
              allowClear={true}
              searchable={false}
            />
          </div>

          {/* Model */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("model")}</label>
            <VirtualSelect
              placeholder={t("selectModel")}
              value={filters.model}
              onValueChange={(value) => updateFilter("model", value || "")}
              fetchOptions={async (search) => {
                console.log("🔍 Fetching models with search:", search);
                console.log("🔍 Current brand:", filters.brand);

                // If brand is not selected, return an empty array
                if (!filters.brand) {
                  console.log("🔍 No brand selected, returning empty array");
                  return [];
                }

                const params = new URLSearchParams();
                if (search) params.append("search", search);
                params.append("mark_id", filters.brand); // FIXED: brand_id → mark_id
                params.append("page_size", "1000"); // Load all data

                const response = await fetch(`/api/public/reference/models?${params}`);
                const data = await response.json();
                console.log("🔍 Models response:", data);
                return data.options || [];
              }}
              allowClear={true}
              searchable={true}
              disabled={!filters.brand}
              dependencies={[filters.brand]} // Reload when brand changes
            />
            {!filters.brand && (
              <p className="text-xs text-slate-500 mt-1">
                {t("selectBrandFirst")}
              </p>
            )}
          </div>

          {/* Year */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("year")}</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="From"
                value={filters.year_from}
                onChange={(e) => updateFilter("year_from", e.target.value)}
              />
              <Input
                type="number"
                placeholder="To"
                value={filters.year_to}
                onChange={(e) => updateFilter("year_to", e.target.value)}
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("price")} (USD)</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="From"
                value={filters.price_from}
                onChange={(e) => updateFilter("price_from", e.target.value)}
              />
              <Input
                type="number"
                placeholder="To"
                value={filters.price_to}
                onChange={(e) => updateFilter("price_to", e.target.value)}
              />
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("region")}</label>
            <VirtualSelect
              placeholder={t("selectRegion")}
              value={filters.region}
              onValueChange={(value, label) => {
                console.log("🔍 Region selected:", { value, label });
                setRegionId(value || ""); // ID for cascading relation with cities
                updateFilter("region", value || ""); // ID used for car search
                // Reset city when region changes
                if (filters.city) {
                  updateFilter("city", "");
                }
              }}
              fetchOptions={async (search) => {
                console.log("🔍 Fetching regions with search:", search);

                const params = new URLSearchParams();
                if (search) params.append("search", search);
                params.append("page_size", "1000"); // Load all data

                const response = await fetch(`/api/public/reference/regions?${params}`);
                const data = await response.json();
                console.log("🔍 Regions response:", data);
                return data.options || [];
              }}
              allowClear={true}
              searchable={true}
            />
          </div>

          {/* City */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("city")}</label>
            <VirtualSelect
              placeholder={t("selectCity")}
              value={filters.city}
              onValueChange={(value, label) => {
                console.log("🔍 City selected:", { value, label });
                updateFilter("city", value || ""); // ID used for car search
              }}
              fetchOptions={async (search) => {
                console.log("🔍 Fetching cities with search:", search);
                console.log("🔍 Current regionId:", regionId);

                // If region is not selected, return an empty array
                if (!regionId) {
                  console.log("🔍 No region selected, returning empty array");
                  return [];
                }

                const params = new URLSearchParams();
                if (search) params.append("search", search);
                params.append("region_id", regionId); // Use regionId for cascading relation
                params.append("page_size", "1000"); // Load all data

                // 🚀 CACHING: use cached fetch for cities
                const data = await cachedFetch(`/api/public/reference/cities?${params}`, {
                  cacheTime: 900, // 15 minutes
                  staleTime: 1800, // 30 minutes stale
                });
                console.log("🔍 Cities response:", data);
                return data.options || [];
              }}
              allowClear={true}
              searchable={true}
              disabled={!filters.region}
              dependencies={[regionId]} // Reload when region changes
            />
            {!regionId && (
              <p className="text-xs text-slate-500 mt-1">
                {t("selectRegionFirst")}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button onClick={applyFilters} className="flex-1" disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {t("common.search")}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              {t("common.clear")}
            </Button>
          </div>

          {/* Quick filters */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">{t("autoria.quickSearch")}</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invertFilters}
                  onChange={(e) => setInvertFilters(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-slate-600">🔄 {t("common.invert") || "Invert"}</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickFilters.with_images}
                  onChange={(e) =>
                    setQuickFilters((prev) => ({ ...prev, with_images: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-slate-600">📷 {t("autoria.withPhotos") || "With photos"}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickFilters.my_ads}
                  onChange={(e) =>
                    setQuickFilters((prev) => ({ ...prev, my_ads: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-slate-600">
                  👤 {t("autoria.myAds") || t("myAdsTitle")}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickFilters.favorites}
                  onChange={(e) =>
                    setQuickFilters((prev) => ({ ...prev, favorites: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-slate-600">❤️ {t("autoria.favorites")}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickFilters.verified}
                  onChange={(e) =>
                    setQuickFilters((prev) => ({ ...prev, verified: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-slate-600">
                  ✅ {t("autoria.verified") || "Verified"}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickFilters.vip}
                  onChange={(e) => setQuickFilters((prev) => ({ ...prev, vip: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-slate-600">⭐ VIP</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickFilters.premium}
                  onChange={(e) =>
                    setQuickFilters((prev) => ({ ...prev, premium: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-slate-600">💎 Premium</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
