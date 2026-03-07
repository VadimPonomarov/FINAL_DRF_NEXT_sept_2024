/**
 * Redis Helper for Token Management
 * Работает через /api/redis route
 */

interface TokenData {
  access: string;
  refresh: string;
  userId?: string;
  email?: string;
  expiresAt?: number;
}

interface RedisResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

class RedisHelper {
  private baseUrl: string;

  constructor() {
    // Определяем базовый URL в зависимости от окружения
    if (typeof window !== 'undefined') {
      this.baseUrl = window.location.origin;
    } else {
      // Server-side
      this.baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 
                   process.env.NEXTAUTH_URL || 
                   'http://localhost:3000';
    }
  }

  /**
   * Сохранить токены в Redis
   */
  async saveTokens(key: string, tokens: TokenData, ttl: number = 3600): Promise<RedisResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/redis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          value: JSON.stringify({
            ...tokens,
            savedAt: Date.now(),
            expiresAt: Date.now() + (ttl * 1000)
          }),
          ttl
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save tokens');
      }

      return {
        success: true,
        data: result,
        message: 'Tokens saved successfully'
      };
    } catch (error) {
      console.error('[RedisHelper] Error saving tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Получить токены из Redis
   */
  async getTokens(key: string): Promise<RedisResponse & { tokens?: TokenData }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/redis?key=${encodeURIComponent(key)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.value) {
        return {
          success: false,
          error: 'Tokens not found'
        };
      }

      const tokens: TokenData = JSON.parse(result.value);
      
      // Проверяем срок действия токена
      if (tokens.expiresAt && Date.now() > tokens.expiresAt) {
        await this.deleteTokens(key);
        return {
          success: false,
          error: 'Tokens expired'
        };
      }

      return {
        success: true,
        tokens,
        data: result
      };
    } catch (error) {
      console.error('[RedisHelper] Error getting tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Удалить токены из Redis
   */
  async deleteTokens(key: string): Promise<RedisResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/redis?key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete tokens');
      }

      return {
        success: true,
        data: result,
        message: 'Tokens deleted successfully'
      };
    } catch (error) {
      console.error('[RedisHelper] Error deleting tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Обновить токен доступа (refresh token flow)
   */
  async refreshTokens(refreshKey: string): Promise<RedisResponse & { tokens?: TokenData }> {
    try {
      // Сначала получаем refresh токен
      const refreshResult = await this.getTokens(refreshKey);
      
      if (!refreshResult.success || !refreshResult.tokens?.refresh) {
        return {
          success: false,
          error: 'Refresh token not found'
        };
      }

      // Отправляем запрос на обновление токена
      const refreshResponse = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshResult.tokens.refresh
        })
      });

      if (!refreshResponse.ok) {
        throw new Error(`Refresh failed: ${refreshResponse.statusText}`);
      }

      const newTokens = await refreshResponse.json();
      
      // Сохраняем новые токены
      const saveResult = await this.saveTokens(refreshKey, {
        access: newTokens.access,
        refresh: newTokens.refresh || refreshResult.tokens.refresh,
        userId: refreshResult.tokens.userId,
        email: refreshResult.tokens.email
      });

      if (!saveResult.success) {
        return {
          success: false,
          error: 'Failed to save refreshed tokens'
        };
      }

      return {
        success: true,
        tokens: {
          access: newTokens.access,
          refresh: newTokens.refresh || refreshResult.tokens.refresh,
          userId: refreshResult.tokens.userId,
          email: refreshResult.tokens.email
        }
      };
    } catch (error) {
      console.error('[RedisHelper] Error refreshing tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Получить валидный токен доступа (с автоматическим обновлением)
   */
  async getValidAccessToken(key: string): Promise<RedisResponse & { accessToken?: string }> {
    try {
      const result = await this.getTokens(key);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      // Если токен еще валиден, возвращаем его
      if (result.tokens && result.tokens.expiresAt && Date.now() < result.tokens.expiresAt) {
        return {
          success: true,
          accessToken: result.tokens.access
        };
      }

      // Иначе пытаемся обновить
      console.log('[RedisHelper] Token expired, attempting refresh...');
      const refreshResult = await this.refreshTokens(key);
      
      if (!refreshResult.success) {
        return {
          success: false,
          error: `Token refresh failed: ${refreshResult.error}`
        };
      }

      return {
        success: true,
        accessToken: refreshResult.tokens?.access
      };
    } catch (error) {
      console.error('[RedisHelper] Error getting valid access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Сгенерировать ключ для токенов на основе пользователя
   */
  generateTokenKey(userId: string, sessionId?: string): string {
    const baseKey = `auth_tokens:${userId}`;
    return sessionId ? `${baseKey}:${sessionId}` : baseKey;
  }

  /**
   * Проверить состояние Redis
   */
  async checkRedisHealth(): Promise<RedisResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/redis-simple`);
      
      if (!response.ok) {
        throw new Error(`Redis health check failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result,
        message: 'Redis is healthy'
      };
    } catch (error) {
      console.error('[RedisHelper] Redis health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
export const redisHelper = new RedisHelper();
export default redisHelper;
