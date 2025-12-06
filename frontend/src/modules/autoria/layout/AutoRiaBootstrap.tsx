"use client";

import { useEffect } from "react";
import { preloadCriticalReferenceData, fetchBrandsWithCache } from "@/modules/autoria/shared/utils/cachedFetch";

export default function AutoRiaBootstrap() {
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log("[AutoRiaBootstrap] Starting Autoria initialization...");
        await Promise.all([
          preloadCriticalReferenceData(),
          fetchBrandsWithCache(),
        ]);
        console.log("[AutoRiaBootstrap] Autoria initialization completed");
      } catch (error) {
        console.error("[AutoRiaBootstrap] Autoria initialization failed:", error);
      }
    };

    initialize();
  }, []);

  return null;
}
