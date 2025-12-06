"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Info,
} from 'lucide-react';

import { useI18n, useTranslation } from '@/contexts/I18nContext';
import AdCounters from '@/components/AutoRia/Components/AdCounters';
import { useAdDetailPageState } from '@/modules/autoria/ad-detail/useAdDetailPageState';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import '@/shared/styles/showroom.css';

import { AdDetailPageProps } from './types';
import { getStatusBadge } from './utils';
import { LoadingState, ErrorState, AdDetailContent } from './components';

const AdDetailViewInternal: React.FC<AdDetailPageProps> = ({
  adId,
  showModerationControls = false,
  onBack,
  onEdit,
}) => {
  const { t, formatDate, formatCurrency } = useI18n();
  const tReact = useTranslation();
  const router = useRouter();
  const { toast } = useToast();

  const {
    adData,
    isLoading,
    loadError,
    isFavorite,
    isAddingToFavorites,
    currentImageIndex,
    setCurrentImageIndex,
    adCountersRef,
    showPhoneList,
    phoneListRef,
    isAuthenticated,
    canShowResetButton,
    reload,
    handleToggleFavorite,
    handleShare,
    handlePhoneButtonClick,
    nextImage,
    prevImage,
    resetAnalyticsCounters,
  } = useAdDetailPageState({ adId });

  // Handle back navigation with optional callback support
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (loadError || !adData) {
    return (
      <ErrorState 
        loadError={loadError} 
        onReload={reload} 
        onBack={handleBack} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{tReact('adView.backButton')}</span>
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">{adData.mark_name} {adData.model}</span>
          {showModerationControls && (
            <>
              <span className="text-gray-400">/</span>
              {/* Reset counters button for owner/superuser */}
              {canShowResetButton && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetAnalyticsCounters}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Reset counters
                  </Button>
                  <span className="text-gray-400">/</span>
                </>
              )}

              <Link href={`/autoria/ads/moderate/${adId}`} className="text-orange-500 hover:text-orange-600">
                Модерация
              </Link>
            </>
          )}
        </nav>

        {/* Title and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
              {adData.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(adData.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{adData.city_name}, {adData.region_name}</span>
              </div>

              {/* Counters */}
              <AdCounters
                ref={adCountersRef}
                adId={adData.id}
                initialCounters={{
                  views_count: (adData as any).meta_views_count || adData.views_count || 0,
                  favorites_count: adData.favorites_count || 0,
                  phone_views_count: (adData as any).meta_phone_views_count || adData.phone_views_count || 0
                }}
                onFavoriteClick={handleToggleFavorite}
                showClickableButtons={true}
                showResetButton={canShowResetButton}
                counterMode="metadata"
                size="md"
                className="text-gray-500"
              />
              {/* Counters tooltip (instead of inline debug text) */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="Stats" className="inline-flex items-center text-slate-400 hover:text-slate-600">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <div>{t('debug.analyticsViewCount', 'Debug: analytics view_count')}: {adData.view_count ?? 0}</div>
                      <div>{t('debug.metadataViewsCount', 'Metadata views_count')}: {(adData as any).meta_views_count ?? adData.views_count ?? 0}</div>
                      <div>{t('debug.analyticsPhoneViewsCount', 'Debug: analytics phone_views_count')}: {adData.phone_views_count ?? 0}</div>
                      <div>{t('debug.metadataPhoneViewsCount', 'Metadata phone_views_count')}: {(adData as any).meta_phone_views_count ?? adData.phone_views_count ?? 0}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {getStatusBadge(adData.status, t)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleToggleFavorite}
              disabled={isAddingToFavorites}
              variant="outline"
              size="sm"
              className={`${isFavorite ? 'text-red-600 border-red-600' : 'text-gray-600 border-gray-300'}`}
            >
              <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? t('autoria.inFavorites', 'In favorites') : t('autoria.addToFavorites', 'Add to favorites')}
            </Button>

            <Button variant="outline" size="sm" className="text-gray-600 border-gray-300" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {t('common.share', 'Share')}
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <AdDetailContent
          adData={adData}
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
          nextImage={nextImage}
          prevImage={prevImage}
          formatCurrency={formatCurrency}
          isAuthenticated={isAuthenticated}
          showPhoneList={showPhoneList}
          phoneListRef={phoneListRef}
          handlePhoneButtonClick={handlePhoneButtonClick}
          tReact={tReact}
          t={t}
          toast={toast}
          router={router}
        />
      </div>
    </div>
  );
};

const AdDetailPage: React.FC<AdDetailPageProps> = (props) => {
  return <AdDetailViewInternal {...props} />;
};

export default AdDetailPage;
