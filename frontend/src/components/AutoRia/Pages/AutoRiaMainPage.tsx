"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  Plus,
  Search,
  User,
  TrendingUp,
  Shield,
  Zap,
  Database,
  Trash2,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import AccountTypeManager from '@/components/AutoRia/AccountTypeManager';
import TestAdsGenerationModal from '@/components/AutoRia/Components/TestAdsGenerationModal';

import PlatformStatsWidget from '@/components/AutoRia/Statistics/PlatformStatsWidget';

const AutoRiaMainPage = () => {
  const { t, formatNumber } = useI18n();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showTestAdsModal, setShowTestAdsModal] = useState(false);
  const [testAdsCount, setTestAdsCount] = useState(3);


  // УДАЛЕНО: Дублирующий запрос к /api/user/profile
  // useUserProfileData в AutoRiaHeader уже загружает эти данные
  // Этот код вызывал CORS ошибки, так как /api/user/profile не существует как Next.js API route

  const isSuperUser = currentUser?.is_superuser || currentUser?.is_staff || true; // Временно true для тестирования




  // Функция генерации тестовых объявлений с выбранными типами изображений
  const generateTestAds = useCallback(async (count?: number, imageTypes?: string[]) => {
    if (isGenerating) return;

    // Если параметры не переданы, используем значения по умолчанию
    if (count === undefined || imageTypes === undefined) {
      count = count || 3;
      imageTypes = imageTypes || ['front', 'side'];
    }

    // Проверяем, что выбраны типы изображений
    if (!imageTypes || imageTypes.length === 0) {
      toast({
        title: "Ошибка",
        description: t('autoria.testAds.imageTypes.noSelection'),
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    // Логируем начало создания с новым алгоритмом
    console.log(`🔄 Начинаем создание ${count} тестовых объявлений с ОБРАТНЫМ КАСКАДОМ (Модель→Марка→Тип)...`);

    try {
      console.log(`🔄 Создаем ${count} тестовых объявлений с REVERSE-CASCADE алгоритмом, типы изображений:`, imageTypes);

      const response = await fetch('/api/autoria/test-ads/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: count,
          includeImages: true,
          imageTypes: imageTypes // Передаем выбранные типы изображений
        })
      });

      // Handle 401 authentication error
      if (response.status === 401) {
        const error = await response.json();
        toast({
          title: "❌ Требуется аутентификация",
          description: error.message || "Пожалуйста, войдите в систему",
          variant: "destructive",
        });

        // Redirect to login with callback URL
        const currentPath = window.location.pathname;
        setTimeout(() => {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }, 1000);
        return;
      }

      if (response.ok) {
        const result = await response.json();

        // Показываем детальный результат
        let detailsText = '';
        if (result.details && result.details.length > 0) {
          detailsText = '\n\n📋 Созданные объявления:\n';
          result.details.forEach((detail: any, index: number) => {
            if (detail.success) {
              detailsText += `${index + 1}. ${detail.title}\n   🖼️ Изображений: ${detail.imagesCount || 0}\n`;
            }
          });
        }

        // Показываем красивое уведомление об успехе
        const successMessage = `Успешно создано ${result.count} объявлений!\n🖼️ Всего изображений: ${result.totalImages || 0}\n⏱️ Время: ${result.duration || 'N/A'}${detailsText}`;
        toast({
          title: "✅ Объявления созданы!",
          description: successMessage,
          variant: "default",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate test ads');
      }
    } catch (error) {
      console.error('Error generating test ads:', error);
      toast({
        title: "❌ Ошибка создания",
        description: t('autoria.testAds.errorCreating', {
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        }),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, toast, t]);




  // Функция очистки всех объявлений
  const clearAllAds = useCallback(async () => {
    if (isGenerating) return;

    const { alertHelpers } = await import('@/components/ui/alert-dialog-helper');
    const confirmed = await alertHelpers.confirmDelete(t('autoria.testAds.allTestAds') || 'всі тестові оголошення');
    if (!confirmed) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/autoria/test-ads/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "✅ Объявления удалены!",
          description: t('autoria.testAds.successDeleted', { count: result.deleted }),
          variant: "default",
        });
      } else {
        throw new Error('Failed to cleanup ads');
      }
    } catch (error) {
      console.error('Error cleaning up ads:', error);
      toast({
        title: "❌ Ошибка удаления",
        description: t('autoria.testAds.errorDeleting'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, t, toast]);



  const features = useMemo(() => [
    {
      icon: <Plus className="h-8 w-8 text-green-600" />,
      title: t('autoria.createAd'),
      description: t('autoria.createAdDesc'),
      href: "/autoria/create-ad",
      badge: null
    },
    {
      icon: <Search className="h-8 w-8 text-purple-600" />,
      title: t('autoria.searchCars'),
      description: t('autoria.searchCarsDesc'),
      href: "/autoria/search",
      badge: null
    },
    // Аналитика теперь доступна во вкладке результатов поиска; отдельный раздел скрываем
    // {
    //   icon: <BarChart3 className="h-8 w-8 text-orange-600" />,
    //   title: t('autoria.analytics'),
    //   description: t('autoria.analyticsDesc'),
    //   href: "/autoria/analytics",
    //   badge: <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">{t('autoria.premium')}</Badge>
    // },
    {
      icon: <User className="h-8 w-8 text-indigo-600" />,
      title: t('autoria.profile'),
      description: t('autoria.profileDesc'),
      href: "/autoria/profile",
      badge: null
    }
  ], [t]);

  // Дополнительные функции для администраторов
  const adminFeatures = useMemo(() => [
    {
      icon: <Database className="h-8 w-8 text-purple-600" />,
      title: t('autoria.admin.detailedStats'),
      description: t('autoria.admin.detailedStatsDesc'),
      href: "/autoria/statistics",
      badge: <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">{t('autoria.adminLabel')}</Badge>
    }
  ], [t]);

  const benefits = useMemo(() => [
    {
      icon: <Shield className="h-6 w-6 text-green-600" />,
      title: t('autoria.benefits.security.title'),
      description: t('autoria.benefits.security.description')
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-600" />,
      title: t('autoria.benefits.fast.title'),
      description: t('autoria.benefits.fast.description')
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
      title: t('autoria.benefits.effective.title'),
      description: t('autoria.benefits.effective.description')
    }
  ], [t]);

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 mt-4 md:mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4">
            <Car className="h-10 sm:h-12 w-10 sm:w-12 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
              {t('autoria.title')}
            </h1>
          </div>
          <p className="text-lg md:text-xl text-slate-600 dark:text-gray-300 mb-4 md:mb-6 px-4">
            {t('autoria.subtitle')}
          </p>

          {/* Статистика платформы */}
          <div className="max-w-2xl mx-auto px-4">
            <PlatformStatsWidget />
          </div>
        </div>


        {/* Основные функции */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 px-4 md:px-0">
          {features.map((feature, index) => (
            <Link key={index} href={feature.href} className="group">


              <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-gray-700 group-hover:bg-slate-200 dark:group-hover:bg-gray-600 transition-colors">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                    {feature.badge}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="mb-4 text-slate-600 dark:text-gray-300">
                    {feature.description}
                  </CardDescription>
                  <Button className="w-full group-hover:bg-primary/90 transition-colors pointer-events-none">
                    {t('common.continue')}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Преимущества */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t('autoria.whyChoose')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 rounded-full bg-slate-100">
                      {benefit.icon}
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Быстрые действия */}
        <div className="flex flex-wrap gap-3 md:gap-4 justify-center items-start px-4 md:px-0">

          <Button
            size="lg"
            onClick={() => setShowTestAdsModal(true)}
            disabled={isGenerating}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md disabled:opacity-50 whitespace-nowrap flex-shrink-0 border-0"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-4 md:h-5 w-4 md:w-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-pulse" />
                <span className="hidden sm:inline animate-pulse">{t('autoria.testAds.creatingDemo')}</span>
                <span className="sm:hidden animate-pulse">{t('autoria.testAds.creating')}</span>
              </>
            ) : (
              <>
                <Database className="h-4 md:h-5 w-4 md:w-5 mr-2" />
                <span className="hidden sm:inline">{t('autoria.testAds.generatorButton')}</span>
                <span className="sm:hidden">{t('autoria.testAds.generatorButtonShort')}</span>
              </>
            )}
          </Button>





          {/* Кнопка управления аккаунтами */}
          <Button
            size="lg"
            onClick={() => setShowAccountManager(true)}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-md whitespace-nowrap flex-shrink-0 border-0"
          >
            <Settings className="h-5 w-5 mr-2" />
            {t('autoria.testAds.manageAccounts')}
          </Button>

          {/* Кнопка очистки */}
          <Button
            size="lg"
            onClick={clearAllAds}
            disabled={isGenerating}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold shadow-md disabled:opacity-50 whitespace-nowrap flex-shrink-0 border-0"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            {t('autoria.testAds.clearAll')}
          </Button>
        </div>

        {/* Футер */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex justify-center items-center">
            <div className="text-sm text-slate-600">
              © 2024 CarHub. {t('autoria.subtitle')}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно управления аккаунтами */}
      <AccountTypeManager
        isVisible={showAccountManager}
        onClose={() => setShowAccountManager(false)}
      />


      {/* Test Ads Generation Modal */}

      <TestAdsGenerationModal
        isOpen={showTestAdsModal}
        onClose={() => setShowTestAdsModal(false)}
        onGenerate={async (count, imageTypes) => {
          setShowTestAdsModal(false);
          await generateTestAds(count, imageTypes);
        }}
        isLoading={isGenerating}
      />
    </div>
  );
};

export default AutoRiaMainPage;
