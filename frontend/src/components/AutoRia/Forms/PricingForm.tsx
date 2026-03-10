"use client";

import React, { useState, useEffect } from 'react';
import { GenericForm } from '@/components/Forms/GenericForm/GenericForm';
// import { carAdSchema } from '../schemas/autoria.schemas';
import { CarAdFormData, Currency } from '@/modules/autoria/shared/types/autoria';
import { ExtendedFormFieldConfig } from '@/components/Forms/GenericForm/GenericForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Info } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface PricingFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

interface CurrencyRate {
  currency: Currency;
  rate: number;
  updated_at: string;
}

const PricingForm: React.FC<PricingFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [convertedPrices, setConvertedPrices] = useState<Record<Currency, number>>({
    USD: 0,
    EUR: 0,
    UAH: 0
  });
  const [loading, setLoading] = useState(true);

  // Загрузка курсов валют
  useEffect(() => {
    const loadCurrencyRates = async () => {
      try {
        console.log('[PricingForm] 📈 Loading currency rates from backend...');

        // Загружаем курсы из бэкенда Django
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/currency/rates/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const backendData = await response.json();
          console.log('[PricingForm] ✅ Got rates from backend:', backendData);

          // Преобразуем данные бэкенда в наш формат
          const rates: CurrencyRate[] = [];

          if (backendData.rates && Array.isArray(backendData.rates)) {
            // Добавляем UAH как базовую валюту
            rates.push({ currency: 'UAH', rate: 1, updated_at: new Date().toISOString() });

            // Преобразуем курсы из бэкенда
            backendData.rates.forEach((rate: any) => {
              if (rate.target_currency === 'USD' || rate.target_currency === 'EUR') {
                rates.push({
                  currency: rate.target_currency,
                  rate: parseFloat(rate.rate),
                  updated_at: rate.fetched_at || new Date().toISOString()
                });
              }
            });
          }

          if (rates.length >= 2) { // Минимум UAH + еще одна валюта
            console.log('[PricingForm] 🎉 Successfully loaded rates from backend');
            setCurrencyRates(rates);
            setLoading(false);
            return;
          }
        }

        console.warn('[PricingForm] ⚠️ Backend rates not available, using fallback');

        // Fallback: актуальные курсы (обновлено 27.08.2024)
        const fallbackRates: CurrencyRate[] = [
          { currency: 'USD', rate: 41.25, updated_at: new Date().toISOString() },
          { currency: 'EUR', rate: 45.80, updated_at: new Date().toISOString() },
          { currency: 'UAH', rate: 1, updated_at: new Date().toISOString() }
        ];

        setCurrencyRates(fallbackRates);
        setLoading(false);

      } catch (error) {
        console.error('[PricingForm] ❌ Failed to load currency rates:', error);

        // Последний fallback с актуальными курсами
        const emergencyRates: CurrencyRate[] = [
          { currency: 'USD', rate: 41.25, updated_at: new Date().toISOString() },
          { currency: 'EUR', rate: 45.80, updated_at: new Date().toISOString() },
          { currency: 'UAH', rate: 1, updated_at: new Date().toISOString() }
        ];

        setCurrencyRates(emergencyRates);
        setLoading(false);
      }
    };

    loadCurrencyRates();
  }, []);

  // Пересчет цен при изменении цены или валюты
  useEffect(() => {
    if (data.price && data.currency && currencyRates.length > 0) {
      const baseRate = currencyRates.find(r => r.currency === data.currency)?.rate || 1;
      const basePriceInUAH = data.price * baseRate;

      const converted: Record<Currency, number> = {
        USD: Math.round(basePriceInUAH / (currencyRates.find(r => r.currency === 'USD')?.rate || 1)),
        EUR: Math.round(basePriceInUAH / (currencyRates.find(r => r.currency === 'EUR')?.rate || 1)),
        UAH: Math.round(basePriceInUAH)
      };

      setConvertedPrices(converted);
    }
  }, [data.price, data.currency, currencyRates]);

  const currencyOptions = [
    { value: 'UAH', label: `₴ UAH - ${t('uah')}` },
    { value: 'USD', label: `$ USD - ${t('usd')}` },
    { value: 'EUR', label: `€ EUR - ${t('eur')}` }
  ];

  // Конфигурация полей
  const fields: ExtendedFormFieldConfig<Pick<CarAdFormData, 'price' | 'currency'>>[] = [
    {
      name: 'price',
      label: t('price'),
      type: 'number',
      placeholder: t('enterPrice'),
      required: true,
      min: 1,
      max: 10000000,
      description: t('priceDescription')
    },
    {
      name: 'currency',
      label: t('currency'),
      type: 'select',
      placeholder: t('selectCurrency'),
      required: true,
      options: currencyOptions,
      description: t('currencyDescription')
    }
  ];

  // Схема валидации для ценообразования
  const pricingSchema: any = null; // Временно отключена валидация

  const handleSubmit = (formData: Pick<CarAdFormData, 'price' | 'currency'>) => {
    onChange(formData);
  };

  const formatPrice = (amount: number, currency: Currency) => {
    const symbols = { USD: '$', EUR: '€', UAH: '₴' };
    return `${symbols[currency]}${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {/* Заголовок секции */}
      <div className="space-y-2 mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          {t('autoria.priceTitle')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('autoria.priceDesc')}
        </p>
      </div>

      {/* Информация о курсах валют */}
      <Card className="relative z-10 currency-rates-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('autoria.currentRates')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {currencyRates.map((rate) => (
              <div key={rate.currency} className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {rate.currency === 'UAH' ? '1.00' : rate.rate.toFixed(2)}
                </div>
                <div className="text-sm text-slate-600">
                  {rate.currency} {rate.currency !== 'UAH' && '→ UAH'}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500 mt-2 text-center">
            {t('autoria.updated')}: {new Date().toLocaleString('uk-UA', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </CardContent>
      </Card>

      {/* Основная форма */}
      <GenericForm
        schema={null}
        fields={fields}
        defaultValues={{
          price: data.price || undefined,
          currency: data.currency || 'UAH'
        }}
        onSubmit={handleSubmit}
        submitText={t('common.continue')}
        showCard={false}
        resetOnSubmit={false}
      />

      {/* Конвертированные цены */}
      {data.price && data.currency && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('autoria.priceInCurrencies', 'Price in different currencies')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(convertedPrices).map(([currency, amount]) => (
                <div key={currency} className="text-center p-4 border rounded-lg">
                  <div className={`text-xl font-bold ${
                    currency === data.currency ? 'text-green-600' : 'text-slate-600'
                  }`}>
                    {formatPrice(amount, currency as Currency)}
                  </div>
                  <div className="text-sm text-slate-500">
                    {currency}
                    {currency === data.currency && (
                      <Badge variant="secondary" className="ml-1">{t('autoria.primary', 'Primary')}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('autoria.pricing.viewerNote1', 'Buyers will see the price in your chosen currency, but can switch currencies.')} {t('autoria.pricing.viewerNote2', 'Conversion uses the NBU rate at the time of viewing.')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Рекомендации по ценообразованию */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 {t('autoria.pricing.tipsTitle', 'Pricing tips')}:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• {t('autoria.pricing.tipMarketResearch', 'Research prices for similar cars')}</li>
          <li>• {t('autoria.pricing.tipPremiumStats', 'Premium users get average price statistics by region')}</li>
          <li>• {t('autoria.pricing.tipConsiderCondition', 'Consider condition, mileage, and configuration')}</li>
          <li>• {t('autoria.pricing.tipTooHigh', 'Too high a price may repel buyers')}</li>
          <li>• {t('autoria.pricing.tipTooLow', 'Too low a price may raise suspicion')}</li>
        </ul>
      </div>

      {/* Показать ошибки если есть */}
      {errors && errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2">❌ {t('autoria.validationErrors', 'Validation errors')}:</h4>
          <ul className="text-sm text-red-800 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PricingForm;
