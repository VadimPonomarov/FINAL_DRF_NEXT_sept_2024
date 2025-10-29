"use client";

import React, { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Eye,
  Check,
  X,
  Settings
} from 'lucide-react';
import { CarAd } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';

interface AdTableRowProps {
  ad: CarAd;
  onStatusChange: (adId: number, newStatus: string) => void;
  onModerate: (adId: number, action: 'approve' | 'reject' | 'review' | 'block' | 'activate', reason?: string) => void;
  onDelete: (adId: number) => void;
  onView: (ad: CarAd) => void;
  formatPrice: (price: number, currency: string, targetCurrency?: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

const AdTableRow = memo<AdTableRowProps>(({ 
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

  const handleReview = useCallback(() => {
    onModerate(ad.id, 'review');
  }, [ad.id, onModerate]);

  const handleBlock = useCallback(() => {
    const reason = prompt(t('autoria.moderation.blockReason'));
    if (reason) {
      onModerate(ad.id, 'block', reason);
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
    <TableRow className="hover:bg-gray-50">
      <TableCell className="font-mono text-sm">{ad.id}</TableCell>
      <TableCell>
        <div className="max-w-[200px]">
          <div className="font-medium line-clamp-2 mb-1">{ad.title}</div>
          <div className="text-xs text-gray-500 line-clamp-2">{ad.description}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <div className="font-medium">{ad.mark_name || ad.mark || '—'}</div>
          <div className="text-gray-500">{ad.model || '—'}</div>
        </div>
      </TableCell>
      <TableCell className="text-sm">{ad.year || '—'}</TableCell>
      <TableCell className="text-sm font-medium text-green-600">
        {formatPrice(ad.price, ad.currency)}
      </TableCell>
      <TableCell>{getStatusBadge(ad.status)}</TableCell>
      <TableCell>
        <div className="text-sm">
          <div className="font-medium">{ad.user?.email || '—'}</div>
          <div className="text-gray-500">{ad.city_name || ad.city || '—'}</div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-gray-500">
        {new Date(ad.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1 items-center justify-start">
          {/* Селектор зміни статусу */}
          <Select
            value={ad.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs">
              <SelectValue>
                <span className="flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  <span>{t(`autoria.moderation.status.${ad.status}`)}</span>
                </span>
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

          {ad.status === 'pending' || ad.status === 'needs_review' ? (
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
          ) : null}

          {ad.status === 'rejected' ? (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white h-7 px-2.5 text-xs"
              onClick={handleReview}
              title={t('autoria.moderation.review')}
            >
              ⚠️
            </Button>
          ) : null}

          {ad.status === 'active' ? (
            <Button
              size="sm"
              className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white h-7 px-2.5 text-xs"
              onClick={handleBlock}
              title={t('autoria.moderation.block')}
            >
              🚫
            </Button>
          ) : null}

          {ad.status === 'blocked' ? (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white h-7 px-2.5 text-xs"
              onClick={handleActivate}
              title={t('autoria.moderation.activate')}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            onClick={handleView}
            className="h-7 px-2.5 text-xs hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
            title={t('autoria.moderation.viewDetails')}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>

          {/* Кнопка видалення */}
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            className="h-7 px-2.5 text-xs"
            title={t('common.delete')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

AdTableRow.displayName = 'AdTableRow';

export default AdTableRow;
