"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/modules/autoria/shared/hooks/use-toast";
import CarAdsService from "@/services/autoria/carAds.service";
import { useAutoRiaAuth } from "@/modules/autoria/shared/hooks/autoria/useAutoRiaAuth";
import type { CarAd } from "@/modules/autoria/shared/types/autoria";
import { useTranslation } from "@/contexts/I18nContext";
import type {
  SearchFiltersState,
  SearchQuickFiltersState,
  UseSearchPageStateResult,
} from "./types/search.types";
import {
  DEFAULT_QUICK_FILTERS,
  DEFAULT_SEARCH_FILTERS,
  buildSearchParams,
  getErrorMessage,
  parseFiltersFromSearchParams,
  parseQuickFiltersFromSearchParams,
} from "./search.utils";
import { deleteAdFromSearchResults, toggleFavoriteForAd } from "./search.handlers";

export function useSearchPageState(): UseSearchPageStateResult {
  const t = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAutoRiaAuth();

  const [filters, setFilters] = useState<SearchFiltersState>({
    ...DEFAULT_SEARCH_FILTERS,
  });

  const [quickFilters, setQuickFilters] = useState<SearchQuickFiltersState>({
    ...DEFAULT_QUICK_FILTERS,
  });

  const [invertFilters, setInvertFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [regionId, setRegionId] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<"results" | "analytics">("results");

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filtersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevSearchParamsRef = useRef<string>("");

  const updateURL = useCallback(
    (newFilters: SearchFiltersState, page: number, sort: string, order: "asc" | "desc") => {
      const params = new URLSearchParams();

      console.log("🔗 updateURL called with filters:", newFilters);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (key === "page_size") return;

        const stringValue = String(value).trim();
        if (stringValue !== "" && stringValue !== "0") {
          params.set(key, stringValue);
          console.log(`  ✅ Added to URL: ${key}=${stringValue}`);
        } else {
          console.log(`  ❌ Skipped empty: ${key}=${value}`);
        }
      });

      if (page > 1) params.set("page", String(page));
      if (sort !== "created_at") params.set("sort", sort);
      if (order !== "desc") params.set("order", order);

      if (quickFilters.with_images) params.set("with_images", "true");
      if (quickFilters.my_ads) params.set("my_ads", "true");
      if (quickFilters.favorites) params.set("favorites", "true");
      if (quickFilters.verified) params.set("verified", "true");
      if (invertFilters) params.set("invert", "true");

      const newURL = params.toString() ? `?${params.toString()}` : "/autoria/search";
      console.log("🔗 New URL:", newURL);
      router.push(newURL, { scroll: false });
    },
    [router, quickFilters, invertFilters]
  );

  const searchCars = useCallback(async () => {
    console.log("🔍 Starting search with filters:", filters);
    console.log("🔍 Filter details:", {
      vehicle_type: filters.vehicle_type,
      brand: filters.brand,
      model: filters.model,
      search: filters.search,
      currentPage,
    });

    const isPagination = paginationLoading;

    if (!isPagination) {
      setLoading(true);
    }

    try {
      const searchParams = buildSearchParams(
        filters,
        currentPage,
        sortBy,
        sortOrder,
        quickFilters,
        invertFilters
      );

      const response = await CarAdsService.getCarAds(searchParams);

      console.log("✅ Search successful:", {
        count: response.count,
        resultsLength: response.results?.length,
        requestedPageSize: filters.page_size,
        currentPage,
      });

      const results = (response.results || []).map((item: CarAd) => {
        if (quickFilters.favorites && !invertFilters && typeof item.is_favorite === "undefined") {
          return { ...item, is_favorite: true };
        }
        return item;
      });

      console.log("🔍 Final results to set:", {
        resultsCount: results.length,
        totalCount: response.count || 0,
      });

      setSearchResults(results);
      setTotalCount(response.count || 0);
    } catch (error: unknown) {
      console.error("❌ Search error:", error);
      const msg = getErrorMessage(error);
      if (quickFilters.favorites && (msg.includes("401") || /unauthorized/i.test(msg))) {
        toast({
          title: t("search.toast.loginRequired"),
          description: t("search.toast.loginRequiredDescription"),
          variant: "destructive",
        });
      }
      setSearchResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setPaginationLoading(false);
    }
  }, [filters, currentPage, quickFilters, invertFilters, sortBy, sortOrder, paginationLoading, buildSearchParams, toast, t]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage === currentPage) return;

      console.log("📄 Page change:", currentPage, "->", newPage);
      setPaginationLoading(true);
      setCurrentPage(newPage);
      updateURL(filters, newPage, sortBy, sortOrder);
    },
    [currentPage, filters, sortBy, sortOrder, updateURL]
  );

  const updateFilter = useCallback(
    (key: keyof Omit<SearchFiltersState, "page_size">, value: string) => {
      console.log("🔄 updateFilter called:", { key, value });
      setFilters((prev) => {
        console.log("🔄 Previous filters:", prev);
        const newFilters: SearchFiltersState = { ...prev, [key]: value };
        console.log("🔄 New filters will be:", newFilters);

        updateURL(newFilters, 1, sortBy, sortOrder);

        return newFilters;
      });
      setCurrentPage(1);

      console.log("🔄 Filter updated, but search will only run on button click");
    },
    [updateURL, sortBy, sortOrder]
  );

  const updateSearchWithDebounce = useCallback(
    (value: string) => {
      setFilters((prev) => {
        const newFilters = { ...prev, search: value };

        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        if (value.trim() === "") {
          console.log("🔍 Search cleared, triggering immediate search");

          updateURL(newFilters, currentPage, sortBy, sortOrder);

          (async () => {
            try {
              setLoading(true);
              const params = buildSearchParams(
                newFilters,
                currentPage,
                sortBy,
                sortOrder,
                quickFilters,
                invertFilters
              );
              const response = await CarAdsService.getCarAds(params);

              setSearchResults(response.results || []);
              setTotalCount(response.count || 0);
            } catch (error) {
              console.error("🔍 Auto-search error:", error);
            } finally {
              setLoading(false);
            }
          })();

          return newFilters;
        }

        searchTimeoutRef.current = setTimeout(async () => {
          console.log("🔍 Auto-search triggered after debounce:", value);

          updateURL(newFilters, currentPage, sortBy, sortOrder);

          try {
            setLoading(true);
            const params = buildSearchParams(
              newFilters,
              currentPage,
              sortBy,
              sortOrder,
              quickFilters,
              invertFilters
            );
            const response = await CarAdsService.getCarAds(params);

            setSearchResults(response.results || []);
            setTotalCount(response.count || 0);
          } catch (error) {
            console.error("🔍 Auto-search error:", error);
          } finally {
            setLoading(false);
          }
        }, 300);

        return newFilters;
      });
    },
    [buildSearchParams, currentPage, sortBy, sortOrder, quickFilters, invertFilters, updateURL]
  );

  const clearSearchField = useCallback(async () => {
    console.log("🔍 Search field cleared via X button, triggering immediate search");

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const newFilters = { ...filters, search: "" };

    setFilters(newFilters);
    updateURL(newFilters, currentPage, sortBy, sortOrder);

    try {
      setLoading(true);
      const params = buildSearchParams(
        newFilters,
        currentPage,
        sortBy,
        sortOrder,
        quickFilters,
        invertFilters
      );
      const response = await CarAdsService.getCarAds(params);

      setSearchResults(response.results || []);
      setTotalCount(response.count || 0);
    } catch (error) {
      console.error("🔍 Clear search error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, sortBy, sortOrder, quickFilters, invertFilters, updateURL, buildSearchParams]);

  const applyFilters = useCallback(() => {
    console.log("🚀 APPLY FILTERS CLICKED!");
    console.log("🚀 Current filters:", filters);
    updateURL(filters, currentPage, sortBy, sortOrder);
    searchCars();
  }, [filters, currentPage, sortBy, sortOrder, updateURL, searchCars]);

  const clearFilters = useCallback(async () => {
    console.log("🔄 clearFilters called - resetting all filters");

    const clearedFilters: SearchFiltersState = {
      ...DEFAULT_SEARCH_FILTERS,
    };

    setFilters(clearedFilters);
    setCurrentPage(1);
    setRegionId("");

    setQuickFilters({
      ...DEFAULT_QUICK_FILTERS,
    });
    setInvertFilters(false);

    router.push("/autoria/search", { scroll: false });

    console.log("🔄 clearFilters - loading all cars without filters");

    try {
      setLoading(true);
      const response = await CarAdsService.getCarAds({
        page: 1,
        page_size: 20,
        ordering: "-created_at",
      });

      console.log("🔄 clearFilters - loaded cars:", response);
      setSearchResults(response.results || []);
      setTotalCount(response.count || 0);
      setCurrentPage(1);
    } catch (error) {
      console.error("🔄 clearFilters - error loading cars:", error);
      setSearchResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleFavoriteToggle = useCallback(
    (carId: number, event?: React.MouseEvent) => {
      return toggleFavoriteForAd({
        carId,
        event,
        togglingIds,
        setTogglingIds,
        setSearchResults,
        setTotalCount,
        quickFilters,
        invertFilters,
        toast,
        t,
      });
    },
    [togglingIds, quickFilters, invertFilters, toast, t]
  );

  const isOwner = useCallback(
    (car: CarAd) => {
      if (!isAuthenticated || !user) return false;

      const userEmail = user.email;
      const carOwnerEmail = car.user?.email;

      if (carOwnerEmail && userEmail) {
        return userEmail === carOwnerEmail;
      }

      return user.is_superuser || false;
    },
    [isAuthenticated, user]
  );

  const handleDeleteAd = useCallback(
    (carId: number, event?: React.MouseEvent) => {
      return deleteAdFromSearchResults({
        carId,
        event,
        deletingIds,
        setDeletingIds,
        searchResults,
        setSearchResults,
        setTotalCount,
        isOwner,
        toast,
        t,
      });
    },
    [deletingIds, searchResults, isOwner, toast, t]
  );

  const handleCountersUpdate = useCallback(
    (adId: number, counters: { favorites_count: number; phone_views_count: number }) => {
      setSearchResults((prevResults) =>
        prevResults.map((ad) =>
          ad.id === adId
            ? {
                ...ad,
                favorites_count: counters.favorites_count,
                phone_views_count: counters.phone_views_count,
              }
            : ad
        )
      );
    },
    []
  );

  useEffect(() => {
    if (isInitialized) return;

    console.log("🔄 Component mounted, restoring filters from URL");

    const params = searchParams!;

    const urlFilters: SearchFiltersState = parseFiltersFromSearchParams(params, 20);

    const urlPage = parseInt(params.get("page") || "1");
    const urlSort = params.get("sort") || "created_at";
    const urlOrder = (params.get("order") || "desc") as "asc" | "desc";

    const urlQuickFilters: SearchQuickFiltersState = parseQuickFiltersFromSearchParams(params);

    const urlInvert = params.get("invert") === "true";

    setFilters(urlFilters);
    setCurrentPage(urlPage);
    setSortBy(urlSort);
    setSortOrder(urlOrder);
    setQuickFilters(urlQuickFilters);
    setInvertFilters(urlInvert);
    setIsInitialized(true);

    console.log("✅ Filters restored from URL:", {
      urlFilters,
      urlPage,
      urlSort,
      urlOrder,
      urlQuickFilters,
      urlInvert,
    });
  }, [searchParams, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;

    const params = searchParams!;

    const currentParamsString = params.toString();

    if (currentParamsString === prevSearchParamsRef.current) {
      return;
    }

    console.log("🔄 URL changed, updating filters from searchParams");
    console.log("Previous params:", prevSearchParamsRef.current);
    console.log("Current params:", currentParamsString);

    prevSearchParamsRef.current = currentParamsString;

    const urlFilters: SearchFiltersState = parseFiltersFromSearchParams(
      params,
      parseInt(params.get("page_size") || "20")
    );

    const urlPage = parseInt(params.get("page") || "1");
    const urlSort = params.get("sort") || "created_at";
    const urlOrder = (params.get("order") || "desc") as "asc" | "desc";

    const urlQuickFilters: SearchQuickFiltersState = parseQuickFiltersFromSearchParams(params);

    const urlInvert = params.get("invert") === "true";

    setFilters(urlFilters);
    setCurrentPage(urlPage);
    setSortBy(urlSort);
    setSortOrder(urlOrder);
    setQuickFilters(urlQuickFilters);
    setInvertFilters(urlInvert);

    console.log("✅ Filters updated from URL:", { urlFilters, urlPage, urlSort, urlOrder });
  }, [searchParams, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;

    console.log("🔄 Component initialized, loading data with filters");
    searchCars();
  }, [isInitialized]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (filtersTimeoutRef.current) {
        clearTimeout(filtersTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    console.log("📄 Page size changed in useEffect:", filters.page_size);
    console.log("📄 Full filters in useEffect:", filters);
  }, [filters.page_size]);

  useEffect(() => {
    console.log("🔄 Filters changed, searchCars will be called:", filters);
  }, [filters]);

  useEffect(() => {
    console.log("🚀 Auto-search trigger", {
      currentPage,
      sortBy,
      sortOrder,
      page_size: filters.page_size,
      quickFilters,
      invertFilters,
    });
    searchCars();
  }, [currentPage, sortBy, sortOrder, filters.page_size, quickFilters, invertFilters]);

  const onSortChange = useCallback(
    (field: string, order: "asc" | "desc") => {
      setSortBy(field);
      setSortOrder(order);
      setCurrentPage(1);
    },
    []
  );

  const onPageSizeChange = useCallback(
    (pageSize: number) => {
      console.log("📄 Page size changed to:", pageSize);
      const newPageSize = Number.isNaN(pageSize) ? 20 : pageSize;
      const newFilters = { ...filters, page_size: newPageSize };
      setFilters(newFilters);
      setCurrentPage(1);
      console.log("📄 New filters after page_size change:", newFilters);
    },
    [filters]
  );

  return {
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
  };
}
