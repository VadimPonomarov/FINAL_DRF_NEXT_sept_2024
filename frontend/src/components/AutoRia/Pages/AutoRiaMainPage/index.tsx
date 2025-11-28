"use client";

import React, { useMemo } from 'react';
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
import AccountTypeManager from '@/components/AutoRia/AccountTypeManager';
import TestAdsGenerationModal from '@/components/AutoRia/Components/TestAdsGenerationModal';
import PlatformStatsWidget from '@/components/AutoRia/Statistics/PlatformStatsWidget';
import { useAutoRiaMainPageState } from '@/modules/autoria/main/useAutoRiaMainPageState';

const AutoRiaMainPage = () => {
  const { t } = useI18n();
  const {
    isGenerating,
    showAccountManager,
    setShowAccountManager,
    showTestAdsModal,
    setShowTestAdsModal,
    generateTestAds,
    clearAllAds,
  } = useAutoRiaMainPageState();

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
    {
      icon: <User className="h-8 w-8 text-indigo-600" />,
      title: t('autoria.profile'),
      description: t('autoria.profileDesc'),
      href: "/autoria/profile",
      badge: null
    }
  ], [t]);

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

          {/* Platform statistics */}
          <div className="max-w-2xl mx-auto px-4">
            <PlatformStatsWidget />
          </div>
        </div>


        {/* Main features */}
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
                  <Button className="w-full pointer-events-none">
                    {t('common.continue')}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Benefits */}
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

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 md:gap-4 justify-center items-start px-4 md:px-0">

          <Button
            size="lg"
            onClick={() => setShowTestAdsModal(true)}
            disabled={isGenerating}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md disabled:opacity-50 whitespace-nowrap flex-shrink-0 border-0 drop-shadow-lg"
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




          {/* Account management button */}
          <Button
            size="lg"
            onClick={() => setShowAccountManager(true)}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-md whitespace-nowrap flex-shrink-0 border-0 drop-shadow-lg"
          >
            <Settings className="h-5 w-5 mr-2" />
            {t('autoria.testAds.manageAccounts')}
          </Button>

          {/* Clear all ads button */}
          <Button
            size="lg"
            onClick={clearAllAds}
            disabled={isGenerating}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold shadow-md disabled:opacity-50 whitespace-nowrap flex-shrink-0 border-0 drop-shadow-lg"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            {t('autoria.testAds.clearAll')}
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex justify-center items-center">
            <div className="text-sm text-slate-600">
              © 2024 CarHub. {t('autoria.subtitle')}
            </div>
          </div>
        </div>
      </div>

      {/* Account management modal */}
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
