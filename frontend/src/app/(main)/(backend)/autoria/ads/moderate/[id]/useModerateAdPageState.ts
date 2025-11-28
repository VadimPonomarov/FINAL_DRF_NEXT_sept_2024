"use client";

import { use } from "react";

export interface ModerateAdPageState {
  adId: number | null;
  isInvalid: boolean;
  rawId: string;
}

export function useModerateAdPageState(
  params: Promise<{ id: string }>,
): ModerateAdPageState {
  const resolvedParams = use(params);

  const rawId = resolvedParams.id;
  const adId = parseInt(rawId, 10);
  const isInvalid = Number.isNaN(adId);

  return {
    adId: isInvalid ? null : adId,
    isInvalid,
    rawId,
  };
}
