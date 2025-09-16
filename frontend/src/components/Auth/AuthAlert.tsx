"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AuthAlert: React.FC = () => {
  const pathname = usePathname();
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const checkAuthIssues = async () => {
      // Показываем алерт только на страницах AutoRia
      if (!pathname?.startsWith('/autoria')) {
        setShowAlert(false);
        return;
      }

      try {
        // Проверяем провайдер
        const providerResponse = await fetch('/api/redis?key=auth_provider');
        const providerData = await providerResponse.json();
        
        if (!providerData.exists || providerData.value !== 'backend') {
          setAlertMessage('Для доступа к AutoRia необходимо переключиться на Backend аутентификацию');
          setShowAlert(true);
          return;
        }

        // Проверяем наличие backend токенов
        const redisResponse = await fetch('/api/redis?key=backend_auth');
        const redisData = await redisResponse.json();
        
        if (!redisData.exists || !redisData.value) {
          setAlertMessage('Для доступа к AutoRia необходимо войти в систему с Backend аутентификацией');
          setShowAlert(true);
          return;
        }

        // Проверяем структуру токенов
        try {
          const authData = JSON.parse(redisData.value);
          if (!authData.access || !authData.refresh) {
            setAlertMessage('Данные аутентификации повреждены - необходимо войти в систему заново');
            setShowAlert(true);
            return;
          }
        } catch (parseError) {
          setAlertMessage('Данные аутентификации повреждены - необходимо войти в систему заново');
          setShowAlert(true);
          return;
        }

        // Все проверки пройдены
        setShowAlert(false);
      } catch (error) {
        console.error('[AuthAlert] Error checking auth:', error);
        setAlertMessage('Ошибка проверки аутентификации - попробуйте войти в систему заново');
        setShowAlert(true);
      }
    };

    checkAuthIssues();
  }, [pathname]);

  if (!showAlert) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[999999] max-w-md">
      <Alert variant="destructive" className="shadow-lg">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1 pr-2">
            {alertMessage}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => window.location.href = '/login'}
              className="h-6 px-2 text-xs"
            >
              Войти
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAlert(false)}
              className="h-6 px-1 text-xs"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AuthAlert;
