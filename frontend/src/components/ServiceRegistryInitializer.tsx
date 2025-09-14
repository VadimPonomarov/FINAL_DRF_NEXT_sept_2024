'use client';

import { useEffect } from 'react';
import { registerCurrentService } from '@/services/serviceRegistry';

/**
 * Компонент для инициализации Service Registry при загрузке приложения
 */
export default function ServiceRegistryInitializer() {
  useEffect(() => {
    // Регистрируем frontend сервис при загрузке приложения
    const initializeServiceRegistry = async () => {
      try {
        console.log('Initializing Service Registry for frontend...');
        await registerCurrentService();
        console.log('Service Registry initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Service Registry:', error);
      }
    };

    initializeServiceRegistry();

    // Устанавливаем heartbeat для поддержания регистрации
    const heartbeatInterval = setInterval(async () => {
      try {
        // Обновляем TTL каждые 2 минуты (TTL = 5 минут)
        const { serviceRegistry } = await import('@/services/serviceRegistry');
        await serviceRegistry.refreshServiceTTL('frontend');
      } catch (error) {
        console.error('Failed to refresh service TTL:', error);
      }
    }, 120000); // 2 минуты

    // Очистка при размонтировании
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Этот компонент не рендерит ничего видимого
  return null;
}
