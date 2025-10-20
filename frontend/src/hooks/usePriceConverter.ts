"use client";

import { useCurrency, Currency } from '@/contexts/CurrencyContext';

interface CarAd {
  price?: number;
  currency?: string;
  price_usd?: number;
  price_eur?: number;
  price_uah?: number;
}

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  UAH: '₴'
};

export const usePriceConverter = () => {
  const { currency } = useCurrency();

  /**
   * Конвертирует цену объявления в выбранную валюту
   * Использует предварительно рассчитанные поля price_usd, price_eur и price_uah из backend
   */
  const convertPrice = (ad: CarAd): { amount: number | null; currency: Currency; symbol: string } => {
    let amount: number | null = null;

    // Выбираем нужное поле в зависимости от выбранной валюты
    switch (currency) {
      case 'USD':
        amount = ad.price_usd ?? null;
        break;
      case 'EUR':
        amount = ad.price_eur ?? null;
        break;
      case 'UAH':
        // Используем price_uah из backend (всегда рассчитывается)
        amount = ad.price_uah ?? null;
        break;
    }

    return {
      amount,
      currency,
      symbol: CURRENCY_SYMBOLS[currency]
    };
  };

  /**
   * Форматирует цену для отображения
   */
  const formatPrice = (ad: CarAd): string => {
    const { amount, symbol } = convertPrice(ad);
    
    if (amount === null || amount === undefined) {
      return 'Цена не указана';
    }

    // Форматируем с разделителями тысяч
    const formatted = amount.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    return `${symbol}${formatted}`;
  };

  /**
   * Получает числовое значение цены в выбранной валюте
   */
  const getPriceValue = (ad: CarAd): number | null => {
    const { amount } = convertPrice(ad);
    return amount;
  };

  return {
    currency,
    convertPrice,
    formatPrice,
    getPriceValue
  };
};

