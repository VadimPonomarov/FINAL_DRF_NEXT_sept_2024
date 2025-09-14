import { signOut } from "next-auth/react";
import { AuthProvider, TOAST_DURATION } from "@/common/constants/constants";
import { getRedisData } from "@/services/redis/redisService";
import { toast } from "@/hooks/use-toast";

import { backendApiHelpers } from "./backend";
import { dummyApiHelpers } from "./dummy";

export interface ErrorHandlerOptions {
  retryCount?: number;
  redirectOnError?: boolean;
  callbackUrl?: string;
}

export const handleApiError = async (
  error: Response | Error,
  options: ErrorHandlerOptions = {}
): Promise<null> => {
  const { retryCount = 0, redirectOnError = true, callbackUrl = "/login" } = options;

  if (error instanceof Response) {
    const status = error.status;
    console.error(`API Error ${status}:`, await error.text());

    switch (status) {
      case 401: {
        if (retryCount === 0) {
          try {
            toast({
              title: "Token Refresh",
              description: "Attempting to refresh authentication token...",
              duration: TOAST_DURATION.MEDIUM,
            });

            const authProvider = await getRedisData("auth_provider") as AuthProvider;
            const helpers = authProvider === AuthProvider.Dummy ? dummyApiHelpers : backendApiHelpers;
            const refreshSuccess = await helpers.refresh();

            toast({
              title: refreshSuccess ? "Token Refresh Success" : "Token Refresh Failed",
              description: refreshSuccess
                ? "Successfully refreshed authentication token"
                : "Failed to refresh token",
              variant: refreshSuccess ? "default" : "destructive",
              duration: refreshSuccess ? TOAST_DURATION.MEDIUM : TOAST_DURATION.ERROR,
            });

            if (refreshSuccess) {
              return null;
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            toast({
              variant: "destructive",
              title: "Token Refresh Error",
              description: refreshError instanceof Error
                ? refreshError.message
                : "Failed to refresh token",
              duration: TOAST_DURATION.ERROR,
            });
          }
        }
        if (redirectOnError) {
          const redirectDelay = 1500;
          toast({
            variant: "destructive",
            title: "Session Expired",
            description: "Please log in again",
            duration: redirectDelay,
          });
          setTimeout(() => {
            signOut({ callbackUrl });
          }, redirectDelay);
        }
        break;
      }

      case 403:
        console.error("Access forbidden");
        if (redirectOnError) {
          signOut({ callbackUrl });
        }
        break;

      case 404:
        console.error("Resource not found");
        if (redirectOnError && typeof window !== 'undefined') {
          // Проверяем, что код выполняется в браузере, а не на сервере
          window.location.href = "/404";
        } else {
          // Если код выполняется на сервере, просто логируем ошибку
          console.error("Resource not found, but continuing execution");
        }
        break;

      case 429:
        console.error("Rate limit exceeded");
        // Можно добавить логику для повторной попытки через некоторое время
        break;

      default:
        console.error("Unexpected API error");
        if (redirectOnError && typeof window !== 'undefined') {
          // Проверяем, что код выполняется в браузере, а не на сервере
          window.location.href = "/error";
        } else {
          // Если код выполняется на сервере, просто логируем ошибку
          console.error("Unexpected API error, but continuing execution");
        }
    }
  } else {
    console.error("Network or parsing error:", error);
    if (redirectOnError && typeof window !== 'undefined') {
      // Проверяем, что код выполняется в браузере, а не на сервере
      window.location.href = "/error";
    } else {
      // Если код выполняется на сервере, просто логируем ошибку
      console.error("Network or parsing error: " + (error instanceof Error ? error.message : String(error)) + ", but continuing execution");
    }
  }

  return null;
};