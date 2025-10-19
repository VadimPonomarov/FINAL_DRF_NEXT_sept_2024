"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency, Currency } from '@/contexts/CurrencyContext';
import { DollarSign, Euro, Coins } from 'lucide-react';

interface CurrencySelectorProps {
  className?: string;
  showLabel?: boolean;
}

const CURRENCY_CONFIG = {
  USD: {
    symbol: '$',
    label: 'USD',
    icon: DollarSign,
    color: 'text-green-600'
  },
  EUR: {
    symbol: '€',
    label: 'EUR',
    icon: Euro,
    color: 'text-blue-600'
  },
  UAH: {
    symbol: '₴',
    label: 'UAH',
    icon: Coins,
    color: 'text-yellow-600'
  }
};

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ 
  className = '', 
  showLabel = true 
}) => {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-slate-700">Валюта:</span>
      )}
      <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
        <SelectTrigger className="w-[120px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              {React.createElement(CURRENCY_CONFIG[currency].icon, { 
                className: `h-4 w-4 ${CURRENCY_CONFIG[currency].color}` 
              })}
              <span className="font-semibold">{CURRENCY_CONFIG[currency].label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(CURRENCY_CONFIG) as Currency[]).map((curr) => {
            const config = CURRENCY_CONFIG[curr];
            return (
              <SelectItem key={curr} value={curr}>
                <div className="flex items-center gap-2">
                  {React.createElement(config.icon, { 
                    className: `h-4 w-4 ${config.color}` 
                  })}
                  <span className="font-medium">{config.symbol} {config.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CurrencySelector;

