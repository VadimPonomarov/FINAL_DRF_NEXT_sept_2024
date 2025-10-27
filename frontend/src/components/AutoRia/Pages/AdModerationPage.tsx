"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Save,
  Eye
} from 'lucide-react';

import { CarAd, AdStatus } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { CarAdsService } from '@/services/autoria/carAds.service';
import { useAutoRiaAuth } from '@/hooks/autoria/useAutoRiaAuth';

interface AdModerationPageProps {
  adId: number;
}

const AdModerationPage: React.FC<AdModerationPageProps> = ({ adId }) => {
  const { t, formatDate } = useI18n();
  const router = useRouter();
  const { user } = useAutoRiaAuth();

  // State
  const [adData, setAdData] = useState<CarAd | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Moderation form state
  const [newStatus, setNewStatus] = useState<AdStatus>('active');
  const [moderationReason, setModerationReason] = useState('');

  // Check permissions
  useEffect(() => {
    if (!user?.is_superuser && !user?.is_staff) {
      router.push('/autoria/search');
      return;
    }
  }, [user, router]);

  // Load ad data on mount
  useEffect(() => {
    loadAdData();
  }, [adId]);

  const loadAdData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      console.log('[AdModerationPage] Loading ad data for ID:', adId);
      
      const data = await CarAdsService.getCarAd(adId);
      console.log('[AdModerationPage] Loaded ad data:', data);
      
      setAdData(data);
      setNewStatus(data.status as AdStatus);
      setModerationReason(data.moderation_reason || '');
      
    } catch (error) {
      console.error('[AdModerationPage] Error loading ad:', error);
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveModeration = async () => {
    if (!adData) return;

    try {
      setIsSaving(true);
      
      // Here you would call the moderation API
      // For now, we'll use a placeholder
      console.log('[AdModerationPage] Saving moderation:', {
        adId,
        status: newStatus,
        reason: moderationReason
      });

      // TODO: Implement actual moderation API call
      // await CarAdsService.moderateAd(adId, newStatus, moderationReason);
      
      toast({ title: '✅ ' + t('common.success'), description: t('moderation.savedSuccessfully') });
      
    } catch (error) {
      console.error('[AdModerationPage] Error saving moderation:', error);
      toast({ title: '❌ ' + t('common.error'), description: t('moderation.errorSaving'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || !adData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Ошибка загрузки</h1>
          <p className="text-slate-600 mb-6 text-center max-w-md">{loadError}</p>
          <div className="flex gap-4">
            <Button onClick={loadAdData}>
              Попробовать снова
            </Button>
            <Button variant="outline" onClick={() => router.push('/autoria/search')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Активное', variant: 'default' as const, icon: CheckCircle },
      pending: { label: 'На модерации', variant: 'secondary' as const, icon: Clock },
      rejected: { label: 'Отклонено', variant: 'destructive' as const, icon: XCircle },
      draft: { label: 'Черновик', variant: 'outline' as const, icon: Clock }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/autoria/search')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          
          <Link href={`/autoria/ads/view/${adId}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Просмотр
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-600">Модерация объявления</span>
        </div>
      </div>

      {/* Ad Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl mb-2">{adData.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>ID: {adData.id}</span>
                <span>Создано: {formatDate(adData.created_at)}</span>
                {getStatusBadge(adData.status)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                ${adData.price} {adData.currency}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Владелец:</span>
              <div className="font-medium">{adData.user.email}</div>
            </div>
            <div>
              <span className="text-slate-600">Тип аккаунта:</span>
              <div className="font-medium capitalize">{adData.user.account_type}</div>
            </div>
            <div>
              <span className="text-slate-600">Автомобиль:</span>
              <div className="font-medium">{adData.brand} {adData.model} {adData.year}</div>
            </div>
            <div>
              <span className="text-slate-600">Местоположение:</span>
              <div className="font-medium">{adData.city}, {adData.region}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Управление модерацией
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Текущий статус
            </label>
            <div className="flex items-center gap-2">
              {getStatusBadge(adData.status)}
              {adData.moderated_at && (
                <span className="text-sm text-slate-600">
                  Модерировано: {formatDate(adData.moderated_at)}
                </span>
              )}
            </div>
          </div>

          {/* New Status */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Новый статус
            </label>
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as AdStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Активное
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    На модерации
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Отклонено
                  </div>
                </SelectItem>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-600" />
                    Черновик
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Moderation Reason */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Причина модерации
            </label>
            <Textarea
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              placeholder="Укажите причину изменения статуса..."
              rows={4}
            />
          </div>

          {/* Previous Moderation History */}
          {adData.moderation_reason && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Предыдущая причина модерации:</strong><br />
                {adData.moderation_reason}
              </AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link href={`/autoria/ads/view/${adId}`}>
              <Button variant="outline">
                Отмена
              </Button>
            </Link>
            
            <Button 
              onClick={handleSaveModeration}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить модерацию
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdModerationPage;
