"use client";

import React from "react";
import { useUserProfileData } from "@/hooks/useUserProfileData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Lock } from "lucide-react";
import SimpleEnhancedAnalyticsPage from "@/components/AutoRia/Pages/SimpleEnhancedAnalyticsPage";
import { useI18n } from "@/contexts/I18nContext";

const AnalyticsPage = () => {
  const { t } = useI18n();
  // Получаем данные профиля пользователя
  const { data: userProfileData, loading } = useUserProfileData();

  // Проверяем, является ли пользователь премиум или суперпользователем
  const isPremiumUser = React.useMemo(() => {
    if (!userProfileData?.account) return false;

    // Проверяем тип аккаунта
    const accountType = userProfileData.account.account_type;
    const isPremium = accountType === 'PREMIUM' || accountType === 'premium';

    // Суперпользователи также имеют доступ к аналитике
    const isSuperUser = userProfileData.profile?.is_superuser || false;

    return isPremium || isSuperUser;
  }, [userProfileData]);

  // Показываем загрузку пока проверяем права доступа
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Если пользователь не премиум - показываем сообщение об ограничении доступа
  if (!isPremiumUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">
              {t('premiumFeature.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {t('premiumFeature.description')}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <Badge variant="secondary" className="bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                {t('premiumFeature.upgradeButton')}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              {t('premiumFeature.contactAdmin')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Если пользователь премиум - показываем страницу аналитики
  return <SimpleEnhancedAnalyticsPage />;
};

export default AnalyticsPage;
