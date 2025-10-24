import { unifiedErrorHandler } from './errors/unifiedErrorHandler';

/**
 * Centralized fetch with automatic error handling for ALL error codes
 * Использует универсальный обработчик ошибок для всего сайта
 *
 * Обрабатывает:
 * - 401 → refresh токенов + retry
 * - 403 → toast "Доступ запрещен"
 * - 404 → toast "Не найдено"
 * - 500/502/503 → toast "Ошибка сервера" + retry
 * - Network errors → toast "Проблемы с сетью"
 *
 * Usage: await fetchWithAuth('/api/autoria/favorites/toggle', { method: 'POST', body: JSON.stringify({ car_ad_id }) })
 */
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  console.log('[fetchWithAuth] Making request to:', input);

  const makeRequest = async () => {
    return fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {})
      },
      cache: 'no-store'
    });
  };

  try {
    const resp = await makeRequest();

    // Если запрос успешен - возвращаем ответ
    if (resp.ok) {
      console.log('[fetchWithAuth] Request successful, status:', resp.status);
      return resp;
    }

    // Обрабатываем ошибку через универсальный обработчик
    console.log(`[fetchWithAuth] ⚠️ Received error ${resp.status}, delegating to unified error handler...`);

    const result = await unifiedErrorHandler.handleHttpError(resp, {
      retryCallback: makeRequest,
      source: 'fetchWithAuth',
      currentPath: typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined,
      showToast: true,
      maxRetries: resp.status >= 500 ? 2 : 1 // Для server errors пытаемся 2 раза
    });

    if (result.retryResult) {
      return result.retryResult;
    }

    return resp;
  } catch (error) {
    // Обрабатываем сетевые ошибки
    console.error('[fetchWithAuth] ❌ Network error:', error);
    
    await unifiedErrorHandler.handleNetworkError(
      error instanceof Error ? error : new Error('Network request failed'),
      {
        source: 'fetchWithAuth',
        showToast: true
      }
    );

    throw error;
  }
}

