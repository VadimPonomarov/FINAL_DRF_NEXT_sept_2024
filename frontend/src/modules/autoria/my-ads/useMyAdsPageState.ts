"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { CarAd, AdStatus } from "@/modules/autoria/shared/types/autoria";
import CarAdsService from "@/services/autoria/carAds.service";
import { useI18n } from "@/contexts/I18nContext";
import { useAutoRiaAuth } from "@/modules/autoria/shared/hooks/autoria/useAutoRiaAuth";
import { usePriceConverter } from "@/modules/autoria/shared/hooks/usePriceConverter";
import { useToast } from "@/modules/autoria/shared/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { UseMyAdsPageStateResult } from "./myAdsPage.types";

export type MyAdsViewMode = "grid" | "list";


export function useMyAdsPageState(): UseMyAdsPageStateResult {
  const { t } = useI18n();
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAutoRiaAuth();
  const ownerEmail = user?.email || "";

  const { formatPrice } = usePriceConverter();
  const { toast } = useToast();

  const [ads, setAds] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const [authError, setAuthError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MyAdsViewMode>("grid");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);

      let ordering = "-created_at";
      switch (sortBy) {
        case "price_asc":
          ordering = "price";
          break;
        case "price_desc":
          ordering = "-price";
          break;
        case "created_desc":
          ordering = "-created_at";
          break;
        case "created_asc":
          ordering = "created_at";
          break;
        case "views_desc":
          ordering = "-view_count";
          break;
        case "views_asc":
          ordering = "view_count";
          break;
        case "title_asc":
          ordering = "title";
          break;
        case "title_desc":
          ordering = "-title";
          break;
        case "status_asc":
          ordering = "status";
          break;
        case "status_desc":
          ordering = "-status";
          break;
      }

      const response = await CarAdsService.getMyCarAds({
        page: 1,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
        ordering,
        search: debouncedSearchTerm.trim() || undefined,
      });

      const items = response.results || [];
      const filtered = statusFilter === "all" ? items.filter((a) => a.status !== "archived") : items;
      setAds(filtered);
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error("[MyAdsPage] Failed to load ads:", error);
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, debouncedSearchTerm]);

  useEffect(() => {
    const checkAuthAndLoadAds = async () => {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        setAuthError("Для просмотра ваших объявлений необходимо войти в систему");
        setLoading(false);
        return;
      }

      setAuthError(null);
      await loadAds();
    };

    checkAuthAndLoadAds();
  }, [authLoading, isAuthenticated, statusFilter, sortBy, debouncedSearchTerm, loadAds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCardClick = useCallback((carId: number) => {
    window.location.href = `/autoria/ads/edit/${carId}`;
  }, []);

  const getStatusBadge = useCallback(
    (status: string): React.ReactNode => {
      switch (status) {
        case "draft":
          return React.createElement(
            Badge,
            { className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
            t("autoria.moderation.status.draft"),
          );
        case "pending":
          return React.createElement(
            Badge,
            { className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
            t("autoria.moderation.status.pending"),
          );
        case "needs_review":
          return React.createElement(
            Badge,
            { className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
            t("autoria.moderation.status.needsReview"),
          );
        case "active":
          return React.createElement(
            Badge,
            { className: "bg-green-100 text-green-800 hover:bg-green-100" },
            t("autoria.moderation.status.active"),
          );
        case "rejected":
          return React.createElement(
            Badge,
            { className: "bg-red-100 text-red-800 hover:bg-red-100" },
            t("autoria.moderation.status.rejected"),
          );
        case "blocked":
          return React.createElement(
            Badge,
            { className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
            t("autoria.moderation.status.blocked"),
          );
        case "sold":
          return React.createElement(
            Badge,
            { className: "bg-teal-100 text-teal-800 hover:bg-teal-100" },
            t("autoria.moderation.status.sold"),
          );
        case "archived":
          return React.createElement(
            Badge,
            { className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
            t("autoria.moderation.status.archived"),
          );
        default:
          return React.createElement(Badge, { variant: "secondary" }, status);
      }
    },
    [t]
  );

  const handleOwnerStatusChange = useCallback(
    async (adId: number, newStatus: AdStatus) => {
      try {
        await CarAdsService.updateMyAdStatus(adId, newStatus);
        setAds((prev) => prev.map((ad) => (ad.id === adId ? { ...ad, status: newStatus } : ad)));

        const statusTranslation = t(`autoria.moderation.status.${newStatus.toLowerCase()}`, newStatus);
        toast({
          variant: "default",
          title: t("notifications.success", "Успех"),
          description: t(
            "autoria.moderation.statusUpdated",
            `Статус изменен на: ${statusTranslation}`
          ),
          duration: 2000,
        });
      } catch (e) {
        console.error("Error updating ad status:", e);
        toast({
          variant: "destructive",
          title: t("notifications.error", "Ошибка"),
          description: t(
            "autoria.moderation.statusUpdateFailed",
            "Не удалось обновить статус. Пожалуйста, попробуйте снова."
          ),
          duration: 3000,
        });
      }
    },
    [toast, t]
  );

  const bulkUpdateStatus = useCallback(
    async (ids: number[], newStatus: AdStatus) => {
      if (!ids.length) return;
      await Promise.allSettled(ids.map((id) => CarAdsService.updateMyAdStatus(id, newStatus)));
      await loadAds();
    },
    [loadAds]
  );

  const bulkDelete = useCallback(
    async (ids: number[]) => {
      if (!ids.length) return;
      await CarAdsService.bulkDeleteMyAds(ids);
      await loadAds();
    },
    [loadAds]
  );

  const deleteAd = useCallback(
    async (id: number) => {
      await CarAdsService.deleteCarAd(id);
      await loadAds();
    },
    [loadAds]
  );

  return {
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
  };
}
