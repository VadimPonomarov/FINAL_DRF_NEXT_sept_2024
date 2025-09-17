'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthRequiredModal } from '@/components/Auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthDemoPage() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  const handleLogin = () => {
    console.log('Redirecting to login...');
    // Here you would typically redirect to your login page
    // For demo purposes, we'll just close the modal
    setShowModal(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Authorization Demo</CardTitle>
          <CardDescription>
            Демонстрация переводов для авторизации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Переводы авторизации:</h3>
            
            <div className="grid gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-2">authRequired.title</h4>
                <p className="text-lg">{t('authRequired.title')}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-2">authRequired.description</h4>
                <p>{t('authRequired.description')}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-2">authRequired.autoRedirect</h4>
                <p>{t('authRequired.autoRedirect')}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-2">authRequired.loginButton</h4>
                <p>{t('authRequired.loginButton')}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={() => setShowModal(true)}
              className="w-full"
            >
              Показать модальное окно авторизации
            </Button>
          </div>
        </CardContent>
      </Card>

      <AuthRequiredModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onLogin={handleLogin}
        autoRedirectSeconds={7}
      />
    </div>
  );
}
