/**
 * Утилиты для форматирования цен с правильным разделением разрядов
 */

export type Currency = 'USD' | 'EUR' | 'UAH';

export interface CurrencyConfig {
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  USD: {
    symbol: '$',
    name: 'Доллары США',
    locale: 'en-US'
  },
  EUR: {
    symbol: '€',
    name: 'Евро',
    locale: 'de-DE'
  },
  UAH: {
    symbol: '₴',
    name: 'Гривны',
    locale: 'uk-UA'
  }
};

/**
 * Форматирует цену с правильным разделением разрядов
 * @param price - цена (число)
 * @param currency - валюта
 * @param options - дополнительные опции форматирования
 */
export function formatPrice(
  price: number | null | undefined,
  currency: string | Currency = 'USD',
  options: {
    showSymbol?: boolean;
    showCurrency?: boolean;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  // Проверяем валидность цены
  if (!price || price <= 0) {
    return 'Цена не указана';
  }

  const {
    showSymbol = true,
    showCurrency = false,
    locale,
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options;

  // Нормализуем валюту
  const normalizedCurrency = (currency as Currency) || 'USD';
  const currencyConfig = CURRENCY_CONFIG[normalizedCurrency];
  
  if (!currencyConfig) {
    console.warn(`Unknown currency: ${currency}, using USD as fallback`);
    return formatPrice(price, 'USD', options);
  }

  // Определяем локаль для форматирования
  const formatLocale = locale || currencyConfig.locale;

  try {
    // Форматируем число с разделителями разрядов
    const formattedNumber = new Intl.NumberFormat(formatLocale, {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping: true // Включаем разделители разрядов
    }).format(price);

    // Собираем итоговую строку
    let result = '';
    
    if (showSymbol) {
      result += currencyConfig.symbol;
    }
    
    result += formattedNumber;
    
    if (showCurrency) {
      result += ` ${normalizedCurrency}`;
    }

    return result;
  } catch (error) {
    console.error('Error formatting price:', error);
    // Fallback форматирование
    const fallbackFormatted = price.toLocaleString('ru-RU');
    return showSymbol ? `${currencyConfig.symbol}${fallbackFormatted}` : fallbackFormatted;
  }
}

/**
 * Форматирует цену для отображения в карточках объявлений
 */
export function formatCardPrice(price: number | null | undefined, currency: string | Currency = 'USD'): string {
  return formatPrice(price, currency, {
    showSymbol: true,
    showCurrency: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Форматирует цену для детального отображения
 */
export function formatDetailedPrice(price: number | null | undefined, currency: string | Currency = 'USD'): string {
  return formatPrice(price, currency, {
    showSymbol: true,
    showCurrency: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Форматирует цену только с числом (без символа валюты)
 */
export function formatPriceNumber(price: number | null | undefined, currency: string | Currency = 'USD'): string {
  return formatPrice(price, currency, {
    showSymbol: false,
    showCurrency: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Получает символ валюты
 */
export function getCurrencySymbol(currency: string | Currency): string {
  const normalizedCurrency = (currency as Currency) || 'USD';
  return CURRENCY_CONFIG[normalizedCurrency]?.symbol || '$';
}

/**
 * Получает название валюты
 */
export function getCurrencyName(currency: string | Currency): string {
  const normalizedCurrency = (currency as Currency) || 'USD';
  return CURRENCY_CONFIG[normalizedCurrency]?.name || 'Доллары США';
}
