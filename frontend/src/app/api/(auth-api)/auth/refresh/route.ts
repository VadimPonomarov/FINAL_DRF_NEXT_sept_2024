import { NextResponse } from "next/server";
import { AuthProvider, API_URLS } from "@/common/constants/constants";
import { getRedisDataApi, setRedisDataApi } from "@/services/redis/redisApiClient";

// Функция для проверки, истек ли токен
function isTokenExpired(token: string): boolean {
  try {
    // Разбираем JWT токен
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Получаем время истечения токена (exp) и текущее время
    const exp = payload.exp * 1000; // exp в JWT хранится в секундах, переводим в миллисекунды
    const now = Date.now();

    // Проверяем, истек ли токен или истекает в ближайшие 5 минут
    const isExpired = now >= exp;
    const expiresInMinutes = (exp - now) / (1000 * 60);

    console.log(`[API Refresh] Token expires in ${expiresInMinutes.toFixed(2)} minutes`);

    return isExpired;
  } catch (error) {
    console.error("[API Refresh] Error checking token expiration:", error);
    // В случае ошибки считаем, что токен истек
    return true;
  }
}

export async function POST() {
  try {
    console.log("[API Refresh] Starting token refresh process");

    // Получаем текущий auth_provider из Redis
    const authProvider = await getRedisDataApi("auth_provider") as AuthProvider || AuthProvider.MyBackendDocs;
    console.log("[API Refresh] Current auth provider:", authProvider);

    // Получаем соответствующие данные аутентификации из Redis
    const redisKey = authProvider === AuthProvider.Dummy ? "dummy_auth" : "backend_auth";
    console.log("[API Refresh] Using Redis key:", redisKey);

    const authData = await getRedisDataApi(redisKey);
    console.log("[API Refresh] Raw auth data from Redis:", authData ? "exists" : "null");

    if (!authData) {
      console.error("[API Refresh] No auth data found in Redis for key:", redisKey);
      return NextResponse.json(
        { error: "Authentication data not found" },
        { status: 401 }
      );
    }

    // Парсим данные
    const parsedData = typeof authData === "string" ? JSON.parse(authData) : authData;


    if (!parsedData.refresh) {
      console.error("[API Refresh] No refresh token in Redis data");
      return NextResponse.json(
        { error: "Refresh token not found" },
        { status: 401 }
      );
    }

    // Проверяем, истек ли текущий токен доступа
    if (parsedData.access && !isTokenExpired(parsedData.access)) {
      console.log("[API Refresh] Access token is still valid, returning existing token");
      return NextResponse.json({
        access: parsedData.access,
        refresh: parsedData.refresh,
        success: true
      });
    }

    console.log("[API Refresh] Access token expired or not present, proceeding with token refresh");

    // Формируем URL и тело запроса в зависимости от провайдера
    // Для локального тестирования используем localhost вместо Docker hostname
    let baseUrl = API_URLS[authProvider];

    // Если это backend провайдер и URL содержит Docker hostname, заменяем на localhost
    if (authProvider === AuthProvider.MyBackendDocs && baseUrl.includes('app:8000')) {
      baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      console.log("[API Refresh] Replaced Docker hostname with localhost for testing");
    }

    console.log("[API Refresh] Base URL from constants:", API_URLS[authProvider]);
    console.log("[API Refresh] Final base URL:", baseUrl);
    console.log("[API Refresh] Environment variables:", {
      BACKEND_URL: process.env.BACKEND_URL,
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL
    });

    // Исправляем URL для обновления токена
    const refreshUrl = authProvider === AuthProvider.Dummy
      ? `${baseUrl}/auth/refresh`
      : `${baseUrl}/api/auth/refresh`;  // Правильный URL для обновления токена

    console.log("[API Refresh] Final refresh URL:", refreshUrl);

    const requestBody = authProvider === AuthProvider.Dummy
      ? { refreshToken: parsedData.refresh }
      : { refresh: parsedData.refresh };

    console.log("[API Refresh] Sending refresh request to:", refreshUrl);

    // Отправляем запрос на обновление токена
    console.log("[API Refresh] Request URL:", refreshUrl);
    console.log("[API Refresh] Request body:", requestBody);

    let response;
    try {
      // Добавляем таймаут для запроса
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Увеличиваем таймаут до 15 секунд

      // Добавляем повторные попытки с задержкой
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;

      // Функция задержки
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      while (retryCount < maxRetries) {
        try {
          console.log(`[API Refresh] Attempt ${retryCount + 1} of ${maxRetries}`);

          // Добавляем задержку между попытками (кроме первой)
          if (retryCount > 0) {
            const delayTime = 1000 * retryCount; // Увеличиваем задержку с каждой попыткой
            console.log(`[API Refresh] Waiting ${delayTime}ms before retry`);
            await delay(delayTime);
          }

          // Создаем новый AbortController для каждой попытки
          const requestController = new AbortController();
          const requestTimeoutId = setTimeout(() => requestController.abort(), 15000);

          console.log(`[API Refresh] Sending request to backend:`, {
            url: refreshUrl,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            bodyKeys: Object.keys(requestBody),
            hasRefreshToken: !!requestBody.refresh
          });

          response = await fetch(refreshUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            cache: "no-store",
            signal: requestController.signal
          });

          // Очищаем таймаут
          clearTimeout(requestTimeoutId);

          console.log(`[API Refresh] Backend response received:`, {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
          });

          // Если запрос успешен, выходим из цикла
          if (response.ok) {
            console.log(`[API Refresh] Request successful on attempt ${retryCount + 1}`);
            break;
          }

          // Если ответ не успешен, логируем детали ошибки
          try {
            const errorText = await response.clone().text();
            console.error(`[API Refresh] Attempt ${retryCount + 1} failed:`, {
              status: response.status,
              statusText: response.statusText,
              body: errorText.substring(0, 500) // Первые 500 символов
            });
          } catch (e) {
            console.error(`[API Refresh] Attempt ${retryCount + 1} failed with status: ${response.status}, could not read response body`);
          }
          retryCount++;

          if (retryCount < maxRetries) {
            // Экспоненциальная задержка перед следующей попыткой
            const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
            console.log(`[API Refresh] Waiting ${delay}ms before next attempt`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (err) {
          // Более подробное логирование ошибок
          console.error(`[API Refresh] Fetch error:`, err);

          // Проверяем тип ошибки
          if (err instanceof TypeError && err.message === 'fetch failed') {
            console.error('[API Refresh] Network error - server may be down or unreachable');
            if (err.cause) {
              console.error('[API Refresh] Error cause:', err.cause);
            }
          } else if (err instanceof DOMException && err.name === 'AbortError') {
            console.error('[API Refresh] Request timed out');
          }

          lastError = err;
          retryCount++;

          if (retryCount < maxRetries) {
            // Увеличиваем задержку при ошибке сети
            const delay = Math.pow(2, retryCount) * 1500; // Увеличиваем задержку
            console.log(`[API Refresh] Error during attempt ${retryCount}. Waiting ${delay}ms before next attempt`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // Если все попытки неудачны и нет ответа
      if (!response && lastError) {
        throw lastError;
      }

      clearTimeout(timeoutId);
      console.log("[API Refresh] Final response status:", response.status);
    } catch (error) {
      console.error("[API Refresh] Fetch error:", error);

      // Проверяем, была ли ошибка таймаута
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: "Request timeout while refreshing token" },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: `Network error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("[API Refresh] Token refresh failed with status:", response.status);
      try {
        const errorData = await response.json();
        console.error("[API Refresh] Error details:", errorData);
      } catch {
        console.error("[API Refresh] Could not parse error response");
      }

      return NextResponse.json(
        { error: `Token refresh failed with status: ${response.status}` },
        { status: response.status }
      );
    }

    // Получаем новые токены
    const data = await response.json();
    console.log("[API Refresh] Backend response data:", {
      hasAccess: !!data.access,
      hasRefresh: !!data.refresh,
      accessLength: data.access ? data.access.length : 0,
      refreshLength: data.refresh ? data.refresh.length : 0,
      otherKeys: Object.keys(data).filter(k => !['access', 'refresh'].includes(k))
    });

    // Нормализуем формат токенов в зависимости от провайдера
    const tokens = authProvider === AuthProvider.Dummy
      ? {
          access: data.accessToken,
          refresh: data.refreshToken
        }
      : {
          access: data.access,
          refresh: data.refresh
        };

    if (!tokens.access) {
      console.error("[API Refresh] Missing access token in response");
      return NextResponse.json(
        { error: "No access token in response" },
        { status: 500 }
      );
    }

    // Если новый refresh токен не пришел, используем старый
    if (!tokens.refresh) {
      console.log("[API Refresh] No new refresh token in response, using existing one");
      tokens.refresh = parsedData.refresh;
    }

    if (!tokens.refresh) {
      console.error("[API Refresh] No refresh token available (neither new nor old)");
      return NextResponse.json(
        { error: "No refresh token available" },
        { status: 500 }
      );
    }

    console.log("[API Refresh] Final tokens:", {
      hasAccess: !!tokens.access,
      hasRefresh: !!tokens.refresh,
      accessLength: tokens.access?.length,
      refreshLength: tokens.refresh?.length,
      refreshSource: data.refresh ? 'new' : 'existing'
    });

    // Сохраняем новые токены в Redis
    console.log("[API Refresh] Saving new tokens to Redis...");

    try {
      await setRedisDataApi(redisKey, JSON.stringify({
        access: tokens.access,
        refresh: tokens.refresh,
        refreshAttempts: 0 // Сбрасываем счетчик попыток
      }), 3600 * 24); // 24 часа

      console.log("[API Refresh] Tokens saved to Redis, verifying...");

      // Проверяем, что токены действительно сохранились
      const verifyData = await getRedisDataApi(redisKey);

      if (!verifyData) {
        console.error("[API Refresh] Verification failed: No data found in Redis");
        return NextResponse.json({
          access: tokens.access,
          refresh: tokens.refresh,
          success: true,
          tokensVerified: false,
          message: "Tokens refreshed but verification failed"
        });
      }

      let parsedVerifyData;
      try {
        parsedVerifyData = JSON.parse(verifyData);
      } catch (parseError) {
        console.error("[API Refresh] Verification failed: Invalid data format in Redis");
        return NextResponse.json({
          access: tokens.access,
          refresh: tokens.refresh,
          success: true,
          tokensVerified: false,
          message: "Tokens refreshed but verification failed"
        });
      }

      if (!parsedVerifyData.access || !parsedVerifyData.refresh) {
        console.error("[API Refresh] Verification failed: Incomplete tokens in Redis");
        return NextResponse.json({
          access: tokens.access,
          refresh: tokens.refresh,
          success: true,
          tokensVerified: false,
          message: "Tokens refreshed but verification failed"
        });
      }

      console.log("[API Refresh] ✅ Tokens successfully verified in Redis");

      return NextResponse.json({
        access: tokens.access,
        refresh: tokens.refresh,
        success: true,
        tokensVerified: true,
        message: "Tokens refreshed and verified successfully"
      });

    } catch (redisError) {
      console.error("[API Refresh] Redis operation failed:", redisError);

      return NextResponse.json({
        access: tokens.access,
        refresh: tokens.refresh,
        success: true,
        tokensVerified: false,
        message: "Tokens refreshed but Redis storage failed"
      });
    }

  } catch (error) {
    console.error("[API Refresh] Unexpected error:", error);

    // Проверяем тип ошибки для более информативного ответа
    let errorMessage = "Internal server error during token refresh";
    let statusCode = 500;

    if (error instanceof TypeError && error.message === 'fetch failed') {
      errorMessage = "Network error - server may be down or unreachable";
      console.error('[API Refresh] Network error details:', error.cause);
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      errorMessage = "Request timed out";
      statusCode = 504; // Gateway Timeout
    } else if (error instanceof Response) {
      errorMessage = `Server responded with status: ${error.status}`;
      statusCode = error.status;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}