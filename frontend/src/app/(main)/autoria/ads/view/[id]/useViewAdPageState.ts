"use client";

import { use } from "react";
import { useAutoRiaAuth } from "@/modules/autoria/shared/hooks/autoria/useAutoRiaAuth";

export interface ViewAdPageState {
  adId: number | null;
  showModerationControls: boolean;
  isInvalid: boolean;
  rawId: string;
}

export function useViewAdPageState(
  params: Promise<{ id: string }>,
): ViewAdPageState {
  const resolvedParams = use(params);
  const { user } = useAutoRiaAuth();

  const rawId = resolvedParams.id;
  const adId = parseInt(rawId, 10);
  const isInvalid = Number.isNaN(adId) || adId <= 0;
  const showModerationControls = Boolean(user?.is_superuser || user?.is_staff);

  return {
    adId: isInvalid ? null : adId,
    showModerationControls,
    isInvalid,
    rawId,
  };
}
