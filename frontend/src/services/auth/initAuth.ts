"use client";

import { AuthProvider } from "@/common/constants/constants";
import { getRedisData, setRedisData } from "../redis/redisService";

/**
 * Инициализирует данные аутентификации в Redis при запуске приложения
 */
export const initAuthData = async (): Promise<void> => {
  try {
    console.log("[initAuth] Initializing auth data...");

    // Проверяем наличие ключа auth_provider
    const authProvider = await getRedisData("auth_provider");
    if (!authProvider) {
      console.log("[initAuth] Setting default auth provider...");
      await setRedisData("auth_provider", AuthProvider.MyBackendDocs, 3600 * 24 * 7); // 7 дней
    } else {
      console.log(`[initAuth] Auth provider already exists: ${authProvider}`);
    }

    // Проверяем наличие ключа backend_auth
    const backendAuth = await getRedisData("backend_auth");
    if (!backendAuth) {
      console.log("[initAuth] Setting empty backend_auth data...");
      await setRedisData(
        "backend_auth",
        JSON.stringify({
          access: "",
          refresh: "",
          refreshAttempts: 0
        }),
        3600 * 24 * 7 // 7 дней
      );
    } else {
      console.log("[initAuth] Backend auth data already exists");
    }

    // Проверяем наличие ключа dummy_auth
    const dummyAuth = await getRedisData("dummy_auth");
    if (!dummyAuth) {
      console.log("[initAuth] Setting empty dummy_auth data...");
      await setRedisData(
        "dummy_auth",
        JSON.stringify({
          access: "",
          refresh: "",
          refreshAttempts: 0
        }),
        3600 * 24 * 7 // 7 дней
      );
    } else {
      console.log("[initAuth] Dummy auth data already exists");
    }

    console.log("[initAuth] Auth data initialization complete");
  } catch (error) {
    console.error("[initAuth] Error initializing auth data:", error);
  }
};
