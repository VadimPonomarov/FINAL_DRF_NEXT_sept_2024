"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface AdViewEntryPageState {
  adId: string;
  setAdId: (value: string) => void;
  parsedId: number;
  canShow: boolean;
  showDirectAd: boolean;
  handleViewClick: () => void;
}

export function useAdViewEntryPageState(): AdViewEntryPageState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const [adId, setAdId] = React.useState<string>(idParam || "");

  const parsedId = Number(adId);
  const canShow = Number.isFinite(parsedId) && parsedId > 0;
  const showDirectAd = Boolean(idParam) && canShow;

  const handleViewClick = React.useCallback(() => {
    if (!canShow) {
      return;
    }
    router.push(`/autoria/ads/view/${parsedId}`);
  }, [canShow, router, parsedId]);

  return {
    adId,
    setAdId,
    parsedId,
    canShow,
    showDirectAd,
    handleViewClick,
  };
}
