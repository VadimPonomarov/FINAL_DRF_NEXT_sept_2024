"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocsPageState, UseDocsPageStateResult } from "./docs.types";

export function useDocsPageState(): UseDocsPageStateResult {
  const [state, setState] = useState<DocsPageState>({
    loading: true,
    error: null,
  });

  const runHealthCheck = useCallback(async () => {
    try {
      console.log("[DocsPage] Checking availability...");

      const response = await fetch("/api/backend-health", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("[DocsPage] Health check result:", result);

      setState({ loading: false, error: null });
    } catch (error: any) {
      console.error("[DocsPage] Error:", error);
      setState({
        loading: false,
        error: error?.message ?? "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  const retry = () => {
    // Поведение оставляем как раньше: полный перезапуск страницы
    window.location.reload();
  };

  return {
    loading: state.loading,
    error: state.error,
    retry,
  };
}
