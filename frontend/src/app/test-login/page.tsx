'use client';

import { useState } from 'react';
import React from 'react';
import { fetchAuth } from '@/app/api/helpers';
import { IBackendAuthCredentials, AuthResponse } from '@/shared/types/auth.interfaces';

interface LoginFormData extends IBackendAuthCredentials {}

interface TokenData {
  access: string;
  refresh: string;
  userId?: string;
  email?: string;
}

interface RedisApiResponse {
  exists: boolean;
  value?: string;
  message?: string;
}

interface RedisSimpleResponse {
  success: boolean;
  message?: string;
  redis_url?: string;
  timestamp?: string;
}

export default function TestLoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [tokens, setTokens] = useState<TokenData | null>(null);
  const [redisStatus, setRedisStatus] = useState<'checking' | 'healthy' | 'error'>('checking');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Проверяем состояние Redis при загрузке
  const checkRedisStatus = async () => {
    addLog('🔍 Checking Redis status...');
    try {
      const response = await fetch('/api/redis-simple');
      if (response.ok) {
        const data: RedisSimpleResponse = await response.json();
        setRedisStatus('healthy');
        addLog('✅ Redis is healthy');
        if (data.redis_url) {
          addLog(`📡 Redis URL: ${data.redis_url}`);
        }
      } else {
        setRedisStatus('error');
        addLog(`❌ Redis error: HTTP ${response.status}`);
      }
    } catch (error) {
      setRedisStatus('error');
      addLog(`❌ Redis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Обработчик изменения формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик логина
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    addLog(`🚀 Starting login for: ${formData.email}`);

    try {
      // Используем существующую функцию fetchAuth с полной Redis интеграцией
      addLog('📡 Sending login request with Redis integration...');
      const authResult = await fetchAuth(formData);

      if (authResult.error) {
        throw new Error(
          typeof authResult.error === 'string' 
            ? authResult.error 
            : authResult.error.message || 'Login failed'
        );
      }

      addLog('✅ Login successful');
      addLog(`📋 Received tokens: access=${authResult.access ? 'YES' : 'NO'}, refresh=${authResult.refresh ? 'YES' : 'NO'}`);
      addLog(`💾 Redis save status: ${authResult.redisSaveSuccess ? 'SUCCESS' : 'FAILED'}`);

      if (!authResult.redisSaveSuccess) {
        addLog('⚠️ Warning: Tokens received but Redis save failed');
      } else {
        addLog('✅ Tokens saved to Redis successfully by fetchAuth');
      }

      // Сохраняем токены в state для отображения
      const tokenData: TokenData = {
        access: authResult.access!,
        refresh: authResult.refresh!,
        userId: authResult.user?.id?.toString(),
        email: authResult.user?.email || formData.email
      };
      
      setTokens(tokenData);

      // Шаг 3: Проверка получения токенов из Redis
      addLog('🔍 Verifying tokens in Redis...');
      try {
        const verifyResponse = await fetch('/api/redis?key=backend_auth');
        if (verifyResponse.ok) {
          const verifyData: RedisApiResponse = await verifyResponse.json();
          if (verifyData.exists && verifyData.value) {
            const savedTokens = JSON.parse(verifyData.value);
            addLog('✅ Tokens retrieved from Redis successfully');
            addLog(`📋 Retrieved: access=${savedTokens.access ? 'YES' : 'NO'}, refresh=${savedTokens.refresh ? 'YES' : 'NO'}`);
          } else {
            addLog('❌ Tokens not found in Redis');
          }
        } else {
          addLog(`❌ Failed to verify tokens: HTTP ${verifyResponse.status}`);
        }
      } catch (error) {
        addLog(`❌ Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Шаг 4: Тест API запроса с токеном
      await testApiRequest();

    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Тест API запроса с токеном из Redis
  const testApiRequest = async () => {
    addLog('🌐 Testing API request with Redis token...');
    
    try {
      // Используем существующую функцию fetchData которая автоматически работает с Redis токенами
      const { fetchData } = await import('@/app/api/helpers');
      
      addLog('✅ Using fetchData with automatic Redis token management');
      
      // Делаем тестовый запрос к API через fetchData
      const apiData = await fetchData('/api/users/public/list/');
      
      if (!apiData) {
        throw new Error('API request failed - no data returned');
      }

      addLog(`✅ API request successful! Got ${apiData.results?.length || apiData.users?.length || 0} users`);
      addLog(`📊 Response format: ${apiData.results ? 'Backend' : apiData.users ? 'Dummy' : 'Unknown'}`);
      
    } catch (error) {
      addLog(`❌ API request error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Тест обновления токена
  const handleTokenRefresh = async () => {
    if (!tokens) {
      addLog('❌ No tokens available for refresh');
      return;
    }

    addLog('🔄 Testing token refresh...');
    
    try {
      // Используем существующую функцию fetchRefresh
      const { fetchRefresh } = await import('@/app/api/helpers');
      
      const refreshResult = await fetchRefresh('backend_auth');
      
      if (refreshResult) {
        addLog('✅ Token refresh successful');
        // Проверяем обновленные токены
        const verifyResponse = await fetch('/api/redis?key=backend_auth');
        if (verifyResponse.ok) {
          const verifyData: RedisApiResponse = await verifyResponse.json();
          if (verifyData.exists && verifyData.value) {
            const updatedTokens = JSON.parse(verifyData.value);
            setTokens({
              access: updatedTokens.access,
              refresh: updatedTokens.refresh,
              userId: updatedTokens.user?.id?.toString(),
              email: updatedTokens.user?.email
            });
          }
        }
      } else {
        addLog('❌ Token refresh failed');
      }
    } catch (error) {
      addLog(`❌ Refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Очистка токенов
  const handleClearTokens = async () => {
    addLog('🗑️ Clearing tokens from Redis...');
    
    try {
      const response = await fetch('/api/redis', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'backend_auth' })
      });

      if (response.ok) {
        addLog('✅ Tokens cleared from Redis');
        setTokens(null);
      } else {
        addLog(`❌ Failed to clear tokens: HTTP ${response.status}`);
      }
    } catch (error) {
      addLog(`❌ Clear error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Очистка логов
  const clearLogs = () => {
    setLogs([]);
  };

  // Проверяем Redis при загрузке
  React.useEffect(() => {
    checkRedisStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">🧪 Test Login with Redis</h1>
          
          {/* Redis Status */}
          <div className="mb-6 p-4 rounded-lg border">
            <h2 className="text-lg font-semibold mb-2">Redis Status</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                redisStatus === 'healthy' ? 'bg-green-500' : 
                redisStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
              }`} />
              <span className="text-sm font-medium">
                {redisStatus === 'healthy' ? 'Connected' : 
                 redisStatus === 'error' ? 'Error' : 'Checking...'}
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="test@example.com"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || redisStatus !== 'healthy'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Login & Save to Redis'}
            </button>
          </form>

          {/* Token Actions */}
          {tokens && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Token Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleTokenRefresh}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  🔄 Refresh Token
                </button>
                <button
                  onClick={handleClearTokens}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  🗑️ Clear Tokens
                </button>
              </div>
              
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>User ID:</strong> {tokens.userId}</p>
                <p><strong>Email:</strong> {tokens.email}</p>
                <p><strong>Access Token:</strong> {tokens.access ? `${tokens.access.substring(0, 20)}...` : 'N/A'}</p>
                <p><strong>Refresh Token:</strong> {tokens.refresh ? `${tokens.refresh.substring(0, 20)}...` : 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="border rounded-lg">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold">Logs</h3>
              <button
                onClick={clearLogs}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="p-4 h-64 overflow-y-auto bg-gray-900 text-green-400 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
