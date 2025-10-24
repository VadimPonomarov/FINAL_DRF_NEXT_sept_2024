import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  Eye, 
  Check, 
  X, 
  AlertCircle, 
  RotateCcw, 
  Ban, 
  CheckCircle 
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface CarAd {
  id: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  year: number;
  city: string;
  price: number;
  currency: string;
  status: string;
  created_at: string;
  user?: {
    email: string;
  };
}

interface ModerationAdCardProps {
  ad: CarAd;
  onModerate: (adId: number, action: 'approve' | 'reject' | 'review' | 'block' | 'activate', reason?: string) => void;
  onSelectAd: (ad: CarAd) => void;
}

/**
 * Мемоизированная карточка объявления для модерации
 * Перерисовывается только при изменении конкретного объявления
 */
const ModerationAdCard: React.FC<ModerationAdCardProps> = React.memo(({ ad, onModerate, onSelectAd }) => {
  const { t, formatDate } = useI18n();

  // Мемоизируем форматирование цены
  const formattedPrice = React.useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: ad.currency || 'USD',
      minimumFractionDigits: 0,
    }).format(ad.price);
  }, [ad.price, ad.currency]);

  // Мемоизируем бейдж статуса
  const statusBadge = React.useMemo(() => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactNode, text: string }> = {
      pending: { variant: 'outline', icon: <AlertCircle className="h-3 w-3" />, text: 'На модерації' },
      active: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, text: 'Активно' },
      rejected: { variant: 'destructive', icon: <X className="h-3 w-3" />, text: 'Відхилено' },
      blocked: { variant: 'destructive', icon: <Ban className="h-3 w-3" />, text: 'Заблоковано' },
      needs_review: { variant: 'secondary', icon: <RotateCcw className="h-3 w-3" />, text: 'Потребує перевірки' },
      draft: { variant: 'outline', icon: <AlertCircle className="h-3 w-3" />, text: 'Чернетка' },
    };

    const config = statusConfig[ad.status] || statusConfig.pending;
    
    // Пробуем получить перевод, если не получается - используем fallback
    const translation = t(`autoria.moderation.status.${ad.status}`);
    const displayText = translation.includes('autoria.moderation') ? config.text : translation;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 text-xs flex-shrink-0 whitespace-nowrap">
        {config.icon}
        {displayText}
      </Badge>
    );
  }, [ad.status, t]);

  // Мемоизируем действия модерации
  const moderationActions = React.useMemo(() => {
    const actions = [];

    // View Details - всегда доступна
    actions.push(
      <Button
        key="view"
        size="sm"
        variant="outline"
        onClick={() => onSelectAd(ad)}
        className="h-8 w-32 flex items-center justify-center text-xs font-medium hover:bg-white hover:text-gray-500"
      >
        <Eye className="h-3 w-3 mr-1" />
        {t('autoria.moderation.viewDetails')}
      </Button>
    );

    if (ad.status === 'pending' || ad.status === 'needs_review') {
      actions.push(
        <Button
          key="approve"
          size="sm"
          className="!bg-green-600 hover:!bg-green-700 !text-white hover:!text-white h-8 w-32 flex items-center justify-center text-xs font-medium shadow-sm"
          onClick={() => onModerate(ad.id, 'approve')}
        >
          <Check className="h-3 w-3 mr-1" />
          {t('autoria.moderation.approve')}
        </Button>,
        <Button
          key="reject"
          size="sm"
          className="!bg-red-600 hover:!bg-red-700 !text-white hover:!text-white h-8 w-32 flex items-center justify-center text-xs font-medium shadow-sm"
          onClick={() => {
            const reason = prompt(t('autoria.moderation.rejectionReasonPrompt'));
            if (reason) {
              onModerate(ad.id, 'reject', reason);
            }
          }}
        >
          <X className="h-3 w-3 mr-1" />
          {t('autoria.moderation.reject')}
        </Button>
      );
    }

    if (ad.status === 'active') {
      actions.push(
        <Button
          key="block"
          size="sm"
          className="!bg-yellow-600 hover:!bg-yellow-700 !text-white hover:!text-white h-8 w-32 flex items-center justify-center text-xs font-medium shadow-sm"
          onClick={() => onModerate(ad.id, 'block')}
        >
          <Ban className="h-3 w-3 mr-1" />
          {t('autoria.moderation.block')}
        </Button>
      );
    }

    if (ad.status === 'blocked' || ad.status === 'rejected') {
      actions.push(
        <Button
          key="activate"
          size="sm"
          className="!bg-blue-600 hover:!bg-blue-700 !text-white hover:!text-white h-8 w-32 flex items-center justify-center text-xs font-medium shadow-sm"
          onClick={() => onModerate(ad.id, 'activate')}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          {t('autoria.moderation.activate')}
        </Button>
      );
    }

    return actions;
  }, [ad.id, ad.status, onModerate, onSelectAd, t]);

  console.log(`[ModerationAdCard] Rendering card for ad ${ad.id}`);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              {ad.title}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1">
                <Car className="h-4 w-4" />
                {ad.brand} {ad.model}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {ad.year}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {ad.city}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 self-start">
            {statusBadge}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 line-clamp-3">
            {ad.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-green-600">
              {formattedPrice}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="h-4 w-4" />
              {ad.user?.email}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-4 w-4" />
            {t('autoria.moderation.created')}: {formatDate(new Date(ad.created_at))}
          </div>

          {/* Moderation Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
            {moderationActions}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения - перерисовываем только если изменилось само объявление
  return (
    prevProps.ad.id === nextProps.ad.id &&
    prevProps.ad.status === nextProps.ad.status &&
    prevProps.ad.title === nextProps.ad.title &&
    prevProps.ad.price === nextProps.ad.price &&
    prevProps.ad.description === nextProps.ad.description
  );
});

ModerationAdCard.displayName = 'ModerationAdCard';

export default ModerationAdCard;

