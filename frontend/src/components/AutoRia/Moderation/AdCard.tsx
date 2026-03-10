"use client";

import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Eye,
  Check,
  X,
  Calendar,
  MapPin,
  Car,
  User,
  Clock,
  Settings
} from 'lucide-react';
import { CarAd } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';

interface AdCardProps {
  ad: CarAd;
  onStatusChange: (adId: number, newStatus: string) => void;
  onModerate: (adId: number, action: 'approve' | 'reject' | 'review' | 'block' | 'activate', reason?: string) => void;
  onDelete: (adId: number) => void;
  onView: (ad: CarAd) => void;
  formatPrice: (price: number, currency: string, targetCurrency?: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

const AdCard = memo<AdCardProps>(({ 
  ad, 
  onStatusChange, 
  onModerate, 
  onDelete, 
  onView, 
  formatPrice, 
  getStatusBadge 
}) => {
  const { t } = useI18n();

  const handleStatusChange = useCallback((newStatus: string) => {
    onStatusChange(ad.id, newStatus);
  }, [ad.id, onStatusChange]);

  const handleApprove = useCallback(() => {
    onModerate(ad.id, 'approve');
  }, [ad.id, onModerate]);

  const handleReject = useCallback(() => {
    const reason = prompt(t('autoria.moderation.rejectionReasonPrompt'));
    if (reason) {
      onModerate(ad.id, 'reject', reason);
    }
  }, [ad.id, onModerate, t]);

  const handleActivate = useCallback(() => {
    onModerate(ad.id, 'activate');
  }, [ad.id, onModerate]);

  const handleView = useCallback(() => {
    onView(ad);
  }, [ad, onView]);

  const handleDelete = useCallback(() => {
    onDelete(ad.id);
  }, [ad.id, onDelete]);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              {typeof ad.title === 'object' ? JSON.stringify(ad.title) : String(ad.title ?? '')}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Car className="h-4 w-4" />
                {ad.brand} {typeof ad.model === 'object' ? JSON.stringify(ad.model) : String(ad.model ?? '')}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {typeof ad.year === 'object' ? JSON.stringify(ad.year) : String(ad.year ?? '')}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {typeof ad.city === 'object' ? JSON.stringify(ad.city) : String(ad.city ?? '')}
              </span>
            </div>
          </div>
          {getStatusBadge(ad.status)}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 line-clamp-3">
            {typeof ad.description === 'object' ? JSON.stringify(ad.description) : String(ad.description ?? '')}
          </p>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-lg font-bold text-green-600">
                {formatPrice(ad.price, ad.currency)}
              </div>
              {/* Конвертація в інші валюти */}
              <div className="flex gap-2 text-xs text-gray-500">
                {ad.currency !== 'USD' && (
                  <span>≈ {formatPrice(ad.price, ad.currency, 'USD')}</span>
                )}
                {ad.currency !== 'EUR' && (
                  <span>≈ {formatPrice(ad.price, ad.currency, 'EUR')}</span>
                )}
                {ad.currency !== 'UAH' && (
                  <span>≈ {formatPrice(ad.price, ad.currency, 'UAH')}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="h-4 w-4" />
              {typeof ad.user?.email === 'object' ? JSON.stringify(ad.user?.email) : String(ad.user?.email ?? '')}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-4 w-4" />
            {t('autoria.moderation.created')}: {new Date(ad.created_at).toLocaleDateString()}
          </div>

          {/* Moderation Actions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t">
            {/* Селектор зміни статусу */}
            <Select
              value={ad.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs">
                <SelectValue>
                  {(() => {
                    const statusKeyMap: Record<string, string> = {
                      draft: 'autoria.moderation.status.draft',
                      pending: 'autoria.moderation.status.pending',
                      needs_review: 'autoria.moderation.status.needsReview',
                      active: 'autoria.moderation.status.active',
                      rejected: 'autoria.moderation.status.rejected',
                      blocked: 'autoria.moderation.status.blocked',
                      sold: 'autoria.moderation.status.sold',
                      archived: 'autoria.moderation.status.archived',
                    };
                    const label = t(statusKeyMap[ad.status] || `autoria.moderation.status.${ad.status}`, ad.status);
                    return (
                      <span className="flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        <span>{label}</span>
                      </span>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">📝 {t('autoria.moderation.status.draft')}</SelectItem>
                <SelectItem value="pending">⏳ {t('autoria.moderation.status.pending')}</SelectItem>
                <SelectItem value="needs_review">🔍 {t('autoria.moderation.status.needsReview')}</SelectItem>
                <SelectItem value="active">✅ {t('autoria.moderation.status.active')}</SelectItem>
                <SelectItem value="rejected">❌ {t('autoria.moderation.status.rejected')}</SelectItem>
                <SelectItem value="blocked">🚫 {t('autoria.moderation.status.blocked')}</SelectItem>
                <SelectItem value="sold">💰 {t('autoria.moderation.status.sold')}</SelectItem>
                <SelectItem value="archived">📦 {t('autoria.moderation.status.archived')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Швидкі дії для модерації */}
            {(ad.status === 'pending' || ad.status === 'needs_review') && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white h-7 px-2.5 text-xs"
                  onClick={handleApprove}
                  title={t('autoria.moderation.approve')}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white h-7 px-2.5 text-xs"
                  onClick={handleReject}
                  title={t('autoria.moderation.reject')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {ad.status === 'blocked' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white h-7 px-2.5 text-xs"
                onClick={handleActivate}
                title={t('autoria.moderation.activate')}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={handleView}
              className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 hover:brightness-100 hover:saturate-100 text-white border-transparent focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ml-auto"
              title={t('autoria.moderation.viewDetails')}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>

            {/* Кнопка видалення */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              className="h-7 px-2.5 text-xs bg-red-600 hover:bg-red-700 hover:brightness-100 hover:saturate-100 text-white border-transparent focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
              title={t('common.delete')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

AdCard.displayName = 'AdCard';

export default AdCard;
