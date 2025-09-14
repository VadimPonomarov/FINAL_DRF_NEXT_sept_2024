"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Car, 
  MapPin, 
  DollarSign, 
  Phone, 
  User, 
  Calendar,
  Gauge,
  Fuel,
  Settings,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { CarAdFormData } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';

interface PreviewFormProps {
  data: Partial<CarAdFormData>;
  onPublish: () => void;
  isLoading: boolean;
  isFormReady?: boolean;
  missingFields?: string[];
}

const PreviewForm: React.FC<PreviewFormProps> = ({
  data,
  onPublish,
  isLoading,
  isFormReady = false,
  missingFields = []
}) => {
  const { t } = useI18n();

  const isFormComplete = !!(
    data.title &&
    data.description &&
    data.brand &&
    data.model &&
    data.year &&
    data.price &&
    data.currency &&
    data.region &&
    data.city &&
    data.contact_name &&
    data.phone
  );

  const formatPrice = (price: number, currency: string) => {
    const symbols = { USD: '$', EUR: '€', UAH: '₴' };
    return `${symbols[currency as keyof typeof symbols] || ''}${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-8 p-4">
      {/* Заголовок секции */}
      <div className="space-y-2 mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          {t('Preview')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('Review Data Before Publishing')}
        </p>
      </div>

      {/* Предупреждение о незавершенности */}
      {!isFormComplete && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('Fill Required Fields')}
          </AlertDescription>
        </Alert>
      )}

      {/* Предпросмотр объявления */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {t('Ad Preview')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Заголовок и цена */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {data.title || t('Ad Title Placeholder')}
              </h2>
              <div className="flex items-center gap-4 text-slate-600">
                <span className="flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  {data.brand} {data.model} {data.year}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {data.city}, {data.region}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                {data.price && data.currency ? formatPrice(data.price, data.currency) : t('Price Not Specified')}
              </div>
              <Badge variant="secondary">
                {data.currency || t('Currency Not Selected')}
              </Badge>
            </div>
          </div>

          {/* Основные характеристики */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <div>
                <div className="text-sm text-slate-500">{t('Year')}</div>
                <div className="font-medium">{data.year || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-slate-500" />
              <div>
                <div className="text-sm text-slate-500">{t('Mileage')}</div>
                <div className="font-medium">{data.mileage ? `${data.mileage.toLocaleString()} км` : '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-slate-500" />
              <div>
                <div className="text-sm text-slate-500">{t('Fuel')}</div>
                <div className="font-medium">{data.fuel_type || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" />
              <div>
                <div className="text-sm text-slate-500">{t('Transmission')}</div>
                <div className="font-medium">{data.transmission || '—'}</div>
              </div>
            </div>
          </div>

          {/* Описание */}
          <div>
            <h3 className="font-semibold mb-2">{t('Description')}</h3>
            <p className="text-slate-700 whitespace-pre-wrap">
              {data.description || t('Description Not Added')}
            </p>
          </div>

          {/* Контактная информация */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">{t('Contact Information')}</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <span>{data.contact_name || t('Name Not Specified')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-500" />
                <span>{data.phone || t('Phone Not Specified')}</span>
              </div>
            </div>
          </div>

          {/* Дополнительная информация */}
          {data.additional_info && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Дополнительная информация</h3>
              <p className="text-slate-700">{data.additional_info}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Информация о модерации */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          {t('autoria.moderationInfo')}
        </AlertDescription>
      </Alert>

      {/* Статус готовности к публикации */}
      {!isFormReady && missingFields.length > 0 && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Для публикации необходимо заполнить:</div>
            <div className="text-sm">{missingFields.join(', ')}</div>
          </AlertDescription>
        </Alert>
      )}

      {/* Кнопка публикации */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={onPublish}
          disabled={!isFormReady || isLoading}
          size="lg"
          className={`${
            isFormReady
              ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Публикация...
            </>
          ) : isFormReady ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Опубликовать объявление
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Заполните все обязательные поля
            </>
          )}
        </Button>

        {isFormReady && (
          <div className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Все данные заполнены, готово к публикации
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewForm;
