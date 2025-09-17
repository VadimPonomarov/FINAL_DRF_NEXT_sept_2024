import React, { useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  autoRedirectSeconds?: number;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  autoRedirectSeconds = 7
}) => {
  const { t } = useI18n();
  const [countdown, setCountdown] = useState(autoRedirectSeconds);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(autoRedirectSeconds);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, autoRedirectSeconds, onLogin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-600" />
          </div>
          <CardTitle className="text-xl font-semibold">
            {t('authRequired.title')}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {t('authRequired.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-500">
            {t('authRequired.autoRedirect').replace('7', countdown.toString())}
          </div>
          <Button 
            onClick={onLogin}
            className="w-full"
            size="lg"
          >
            {t('authRequired.loginButton')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthRequiredModal;
