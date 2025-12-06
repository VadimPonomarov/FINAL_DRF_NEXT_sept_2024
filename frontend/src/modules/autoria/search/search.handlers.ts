import type React from "react";
import { FavoritesService } from "@/services/autoria/favorites.service";
import { smartFetch } from "@/modules/autoria/shared/utils/smartFetch";
import { alertHelpers } from "@/components/ui/alert-dialog-helper";
import type { CarAd } from "@/modules/autoria/shared/types/autoria";
import { getErrorMessage } from "./search.utils";
import type { SearchQuickFiltersState } from "./types/search.types";

type ToastLike = (props: { title?: string; description?: string; variant?: string }) => unknown;

type TranslationFn = (key: string, fallback?: string) => string;

export interface ToggleFavoriteParams {
  carId: number;
  event?: React.MouseEvent;
  togglingIds: Set<number>;
  setTogglingIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  setSearchResults: React.Dispatch<React.SetStateAction<CarAd[]>>;
  setTotalCount: React.Dispatch<React.SetStateAction<number>>;
  quickFilters: SearchQuickFiltersState;
  invertFilters: boolean;
  toast: ToastLike;
  t: TranslationFn;
}

export const toggleFavoriteForAd = async ({
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
}: ToggleFavoriteParams): Promise<void> => {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  if (togglingIds.has(carId)) return;

  let previousIsFavorite: boolean | undefined;
  setSearchResults((prev) =>
    prev.map((c) => {
      if (c.id === carId) {
        previousIsFavorite = Boolean(c.is_favorite);
        return { ...c, is_favorite: !Boolean(c.is_favorite) };
      }
      return c;
    })
  );

  setTogglingIds((prev) => new Set(prev).add(carId));
  console.log("🔄 Toggle favorite (optimistic) for car:", carId, "prev:", previousIsFavorite);

  try {
    const result = await FavoritesService.toggleFavorite(carId);
    console.log("✅ Favorite toggled (server):", result);

    setSearchResults((prevResults) =>
      prevResults.map((car) =>
        car.id === carId
          ? {
              ...car,
              is_favorite: Boolean(result.is_favorite),
              favorites_count:
                typeof result.favorites_count === "number"
                  ? result.favorites_count
                  : result.is_favorite
                  ? (car.favorites_count || 0) + 1
                  : Math.max(0, (car.favorites_count || 0) - 1),
            }
          : car
      )
    );

    const shouldRemoveNow =
      (quickFilters.favorites && !invertFilters && result.is_favorite === false) ||
      (quickFilters.favorites && invertFilters && result.is_favorite === true);
    if (shouldRemoveNow) {
      setSearchResults((prev) => prev.filter((c) => c.id !== carId));
      setTotalCount((prev) => Math.max(0, (prev || 0) - 1));
    }

    setTimeout(async () => {
      try {
        const response = await smartFetch(`/api/autoria/cars/${carId}`);
        if (response.ok) {
          const carData = await response.json();
          setSearchResults((prevResults) =>
            prevResults.map((car) =>
              car.id === carId
                ? {
                    ...car,
                    favorites_count: carData.favorites_count || 0,
                    phone_views_count: carData.phone_views_count || 0,
                    view_count: carData.view_count || 0,
                    ...(typeof carData.is_favorite !== "undefined"
                      ? { is_favorite: Boolean(carData.is_favorite) }
                      : {}),
                  }
                : car
            )
          );
        }
      } catch (syncError) {
        console.warn("⚠️ Failed to sync counters:", syncError);
      }
    }, 400);
  } catch (error: unknown) {
    console.error("❌ Error toggling favorite:", error);
    setSearchResults((prev) =>
      prev.map((c) => (c.id === carId ? { ...c, is_favorite: previousIsFavorite } : c))
    );

    const msg = getErrorMessage(error);
    if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
      toast({
        title: t("search.toast.loginRequired"),
        description: t("search.toast.favoriteToggleErrorDescription"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("search.toast.favoriteToggleError"),
        description: t("search.toast.favoriteToggleErrorDescription"),
        variant: "destructive",
      });
    }
  } finally {
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(carId);
      return next;
    });
  }
};

export interface DeleteAdParams {
  carId: number;
  event?: React.MouseEvent;
  deletingIds: Set<number>;
  setDeletingIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  searchResults: CarAd[];
  setSearchResults: React.Dispatch<React.SetStateAction<CarAd[]>>;
  setTotalCount: React.Dispatch<React.SetStateAction<number>>;
  isOwner: (car: CarAd) => boolean;
  toast: ToastLike;
  t: TranslationFn;
}

export const deleteAdFromSearchResults = async ({
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
}: DeleteAdParams): Promise<void> => {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  if (deletingIds.has(carId)) return;

  const car = searchResults.find((c) => c.id === carId);
  if (!car || !isOwner(car)) {
    toast({
      title: t("search.toast.noAccess"),
      description: t("search.toast.noAccessDescription"),
      variant: "destructive",
    });
    return;
  }

  const confirmed = await alertHelpers.confirmDelete(t("autoria.thisAd") || "це оголошення");
  if (!confirmed) return;

  setDeletingIds((prev) => new Set(prev).add(carId));

  try {
    const response = await smartFetch(`/api/autoria/cars/${carId}/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    setSearchResults((prev) => prev.filter((c) => c.id !== carId));
    setTotalCount((prev) => Math.max(0, (prev || 0) - 1));

    toast({
      title: t("search.toast.adDeleted"),
      description: t("search.toast.adDeletedDescription"),
    });
  } catch (error: unknown) {
    console.error("❌ Error deleting ad:", error);

    const msg = getErrorMessage(error);
    if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
      toast({
        title: t("search.toast.loginRequiredDelete"),
        description: t("search.toast.loginRequiredDeleteDescription"),
        variant: "destructive",
      });
    } else if (msg.toLowerCase().includes("forbidden") || msg.includes("403")) {
      toast({
        title: t("search.toast.noAccess"),
        description: t("search.toast.noAccessDescription"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("search.toast.deleteError"),
        description: t("search.toast.deleteErrorDescription"),
        variant: "destructive",
      });
    }
  } finally {
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(carId);
      return next;
    });
  }
};
