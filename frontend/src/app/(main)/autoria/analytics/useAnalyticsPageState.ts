"use client";

import React from "react";
import { useUserProfileData } from "@/modules/autoria/shared/hooks/useUserProfileData";
import { AccountTypeEnum } from "@/shared/types/backend-user";

export interface AnalyticsPageState {
  loading: boolean;
  isPremiumUser: boolean;
}

export function useAnalyticsPageState(): AnalyticsPageState {
  const { data: userProfileData, loading } = useUserProfileData();

  const isPremiumUser = React.useMemo(() => {
    if (!userProfileData?.account) return false;

    const accountType = userProfileData.account.account_type;
    const isPremium = accountType === AccountTypeEnum.PREMIUM;
    const isSuperUser = userProfileData.user?.is_superuser ?? false;

    return isPremium || isSuperUser;
  }, [userProfileData]);

  return { loading, isPremiumUser };
}
