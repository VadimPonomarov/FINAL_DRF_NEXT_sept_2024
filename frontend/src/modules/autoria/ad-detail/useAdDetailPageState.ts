"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CarAd } from "@/modules/autoria/shared/types/autoria";
import { useAutoRiaAuth } from "@/modules/autoria/shared/hooks/autoria/useAutoRiaAuth";
import { useToast } from "@/modules/autoria/shared/hooks/use-toast";
import { FavoritesService } from "@/services/autoria/favorites.service";

interface AdCountersRef {
  forceRefresh: () => Promise<any>;
}

export interface UseAdDetailPageStateParams {
  adId: number;
}

export interface UseAdDetailPageStateResult {
  adData: CarAd | null;
  isLoading: boolean;
  loadError: string | null;
  isFavorite: boolean;
  isAddingToFavorites: boolean;
  currentImageIndex: number;
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>;
  adCountersRef: React.RefObject<AdCountersRef | null>;
  showPhoneList: boolean;
  phoneListRef: React.RefObject<HTMLDivElement | null>;
  isAuthenticated: boolean;
  canShowResetButton: boolean;
  reload: () => Promise<void>;
  handleToggleFavorite: () => Promise<void>;
  handleShare: () => Promise<void>;
  handlePhoneButtonClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  nextImage: () => void;
  prevImage: () => void;
  resetAnalyticsCounters: () => Promise<void>;
}

export function useAdDetailPageState(
  params: UseAdDetailPageStateParams,
): UseAdDetailPageStateResult {
  const { adId } = params;

  const { user, isAuthenticated, getToken } = useAutoRiaAuth();
  const { toast } = useToast();

  const [adData, setAdData] = useState<CarAd | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPhoneList, setShowPhoneList] = useState(false);

  const adCountersRef = useRef<AdCountersRef | null>(null);
  const phoneListRef = useRef<HTMLDivElement | null>(null);

  const loadAdData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      console.log("[AdDetailPage] Loading ad data for ID:", adId);

      // Use the same API as ShowroomPage to keep counters in sync
      const response = await fetch(`/api/autoria/cars/${adId}`);
      if (!response.ok) {
        throw new Error(`Failed to load car ad: ${response.status}`);
      }

      const data = await response.json();
      console.log("[AdDetailPage] Loaded ad data:", data);
      console.log("[AdDetailPage] Images data:", data.images);
      console.log("[AdDetailPage] Images count:", data.images?.length || 0);
      if (data.images && data.images.length > 0) {
        console.log("[AdDetailPage] First image:", data.images[0]);
        console.log("[AdDetailPage] First image display URL:", data.images[0].image_display_url);
      }

      setAdData(data);

      // Get actual favorite status for the current user
      if (user) {
        try {
          const token = await getToken();
          const favoriteResponse = await fetch(`/api/autoria/favorites/check/${adId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (favoriteResponse.ok) {
            const favoriteData = await favoriteResponse.json();
            setIsFavorite(favoriteData.is_favorite || false);
          }
        } catch (error) {
          console.error("[AdDetailPage] Error checking favorite status:", error);
          setIsFavorite(false);
        }
      } else {
        setIsFavorite(false);
      }

      console.log("[AdDetailPage] Counters loaded:", {
        favorites_count: data.favorites_count,
        phone_views_count: data.phone_views_count,
        view_count: data.view_count,
      });

      // Removed extra forced state update to avoid double re-render
      // setAdData({ ...data });
    } catch (error) {
      console.error("[AdDetailPage] Error loading ad:", error);
      setLoadError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [adId, user, getToken]);

  useEffect(() => {
    loadAdData();
  }, [loadAdData]);

  useEffect(() => {
    if (!showPhoneList) return;

    function handleClickOutside(e: MouseEvent) {
      if (phoneListRef.current && !phoneListRef.current.contains(e.target as Node)) {
        setShowPhoneList(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPhoneList]);

  // Track a view once when adId changes
  useEffect(() => {
    let cancelled = false;

    const trackView = async () => {
      try {
        const resp = await fetch("/api/tracking/ad-interaction/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ad_id: adId,
            interaction_type: "view",
            source_page: "ad_view",
            session_id:
              typeof window !== "undefined"
                ? sessionStorage.getItem("visitor_session_id") ||
                  (sessionStorage.setItem("visitor_session_id", crypto.randomUUID()),
                  sessionStorage.getItem("visitor_session_id"))
                : undefined,
            metadata: { timestamp: new Date().toISOString() },
          }),
        });

        if (resp.ok && !cancelled) {
          setTimeout(() => {
            if (!cancelled) {
              // Force refresh counters in AdCounters
              adCountersRef.current?.forceRefresh();
            }
          }, 800);
        }
      } catch (e) {
        console.warn("[AdDetailPage] view tracking failed", e);
      }
    };

    trackView();
    return () => {
      cancelled = true;
    };
  }, [adId]);

  const handleToggleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      toast({
        title: "Требуется авторизация",
        description: "Для добавления в избранное необходимо войти в систему",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingToFavorites(true);

      // Use a unified toggleFavorite method
      const response = await FavoritesService.toggleFavorite(adId);

      console.log("[AdDetailPage] Favorite toggled:", {
        adId,
        is_favorite: response.is_favorite,
        message: response.message,
      });

      // Update favorite state with real value from backend
      setIsFavorite(response.is_favorite);

      // Track favorite interaction event
      try {
        const trackingResponse = await fetch("/api/tracking/ad-interaction/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ad_id: adId,
            interaction_type: response.is_favorite ? "favorite_add" : "favorite_remove",
            source_page: "ad_view",
            session_id:
              (typeof window !== "undefined"
                ? sessionStorage.getItem("visitor_session_id")
                : undefined) || undefined,
            metadata: {
              timestamp: new Date().toISOString(),
            },
          }),
        });

        if (trackingResponse.ok) {
          console.log("✅ Favorite interaction tracked successfully");
          // Update only favorites_count in local state, without page reload
          if (adData && typeof response.favorites_count === "number") {
            setAdData((prev) => (prev ? { ...prev, favorites_count: response.favorites_count } : prev));
          }
        }
      } catch (trackingError) {
        console.error("❌ Error tracking favorite interaction:", trackingError);
      }

      // Show success message
      toast({
        title: response.is_favorite ? "Добавлено в избранное" : "Удалено из избранного",
        description:
          response.message ||
          (response.is_favorite
            ? "Объявление добавлено в ваш список избранного"
            : "Объявление удалено из избранного"),
        variant: "default",
      });

      // favorites_count is already updated above; no need to reload the entire page
    } catch (error) {
      console.error("[AdDetailPage] Error toggling favorite:", error);
      toast({
        title: "Ошибка",
        description: "Ошибка при изменении статуса избранного. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToFavorites(false);
    }
  }, [adId, adData, isAuthenticated, toast]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: adData?.title,
          text: adData?.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "✅ Успіх", description: "Посилання скопійовано в буфер обміну" });
    }
  }, [adData, toast]);

  const nextImage = useCallback(() => {
    if (adData?.images) {
      setCurrentImageIndex((prev) => (prev === adData.images.length - 1 ? 0 : prev + 1));
    }
  }, [adData]);

  const prevImage = useCallback(() => {
    if (adData?.images) {
      setCurrentImageIndex((prev) => (prev === 0 ? adData.images.length - 1 : prev - 1));
    }
  }, [adData]);

  const resetAnalyticsCounters = useCallback(async () => {
    if (!adData) return;

    try {
      const resp = await fetch(`/api/ads/analytics/reset?ad_id=${adData.id}`, { method: "POST" });
      if (resp.ok) {
        // Reset analytics-related counters in local state
        setAdData((prev) =>
          prev
            ? {
                ...prev,
                meta_views_count: 0,
                meta_phone_views_count: 0,
                view_count: 0,
                phone_views_count: 0,
              }
            : prev,
        );
      }
    } catch (e) {
      console.error("Failed to reset counters", e);
    }
  }, [adData]);

  const handlePhoneButtonClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      // Track phone view
      try {
        console.log("📞 Tracking phone view for ad:", adId);
        const trackingResponse = await fetch("/api/tracking/ad-interaction/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ad_id: adId,
            interaction_type: "phone_reveal",
            source_page: "ad_view",
            session_id:
              typeof window !== "undefined"
                ? sessionStorage.getItem("visitor_session_id") ||
                  (sessionStorage.setItem("visitor_session_id", crypto.randomUUID()),
                  sessionStorage.getItem("visitor_session_id"))
                : undefined,
            metadata: {
              timestamp: new Date().toISOString(),
            },
          }),
        });

        if (trackingResponse.ok) {
          console.log("✅ Phone view tracked successfully");
          // Update only counters without reloading the entire ad
          setTimeout(() => {
            // Force refresh of counters in AdCounters
            adCountersRef.current?.forceRefresh();
          }, 800);
        }
      } catch (trackingError) {
        console.error("❌ Error tracking phone view:", trackingError);
      }

      // Toggle phone dropdown while keeping tracking logic above unchanged
      // Even if there are no phone numbers, still show dropdown with a gentle message
      setShowPhoneList((prev) => !prev);
    },
    [adId],
  );

  const canShowResetButton = useMemo(
    () =>
      Boolean(
        user &&
          (user.is_superuser ||
            user.id === adData?.user?.id ||
            (user.email &&
              adData?.user?.email &&
              user.email.toLowerCase() === adData.user.email.toLowerCase())),
      ),
    [user, adData?.user?.id, adData?.user?.email],
  );

  console.log("[AdDetailPage] reset button check:", {
    user: user ? { id: user.id, email: user.email, is_superuser: user.is_superuser } : null,
    adUser: adData?.user ? { id: adData.user.id, email: adData.user.email } : null,
    canShowResetButton,
  });

  return {
    adData,
    isLoading,
    loadError,
    isFavorite,
    isAddingToFavorites,
    currentImageIndex,
    setCurrentImageIndex,
    adCountersRef,
    showPhoneList,
    phoneListRef,
    isAuthenticated,
    canShowResetButton,
    reload: loadAdData,
    handleToggleFavorite,
    handleShare,
    handlePhoneButtonClick,
    nextImage,
    prevImage,
    resetAnalyticsCounters,
  };
}
