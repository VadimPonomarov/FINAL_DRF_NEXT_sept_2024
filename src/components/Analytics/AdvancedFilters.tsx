"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  MapPin,
  Car,
  DollarSign,
  Filter,
  X,
  RotateCcw,
  Search
} from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { addDays, subDays } from 'date-fns';

export interface AnalyticsFilters {
  period: '7d' | '30d' | '90d' | '1y' | 'custom';
  dateRange?: DateRange;
  region?: string;
  brand?: string;
  category?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  yearRange?: {
    min?: number;
    max?: number;
  };
  mileageRange?: {
    min?: number;
    max?: number;
  };
  fuelType?: string;
  transmission?: string;
  condition?: string;
}

interface AdvancedFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  loading?: boolean;
  className?: string;
}

const REGIONS = [
  { value: 'kyiv', label: 'Киев' },
  { value: 'kharkiv', label: 'Харьков' },
  { value: 'odesa', label: 'Одесса' },
  { value: 'dnipro', label: 'Днепр' },
  { value: 'lviv', label: 'Львов' },
  { value: 'zaporizhzhia', label: 'Запорожье' },
  { value: 'kryvyi_rih', label: 'Кривой Рог' },
  { value: 'mykolaiv', label: 'Николаев' }
];

const BRANDS = [
  { value: 'toyota', label: 'Toyota' },
  { value: 'bmw', label: 'BMW' },
  { value: 'mercedes', label: 'Mercedes-Benz' },
  { value: 'audi', label: 'Audi' },
  { value: 'volkswagen', label: 'Volkswagen' },
  { value: 'ford', label: 'Ford' },
  { value: 'hyundai', label: 'Hyundai' },
  { value: 'kia', label: 'KIA' },
  { value: 'nissan', label: 'Nissan' },
  { value: 'honda', label: 'Honda' }
];

const CATEGORIES = [
  { value: 'sedan', label: 'Седан' },
  { value: 'hatchback', label: 'Хэтчбек' },
  { value: 'suv', label: 'Кроссовер/SUV' },
  { value: 'wagon', label: 'Универсал' },
  { value: 'coupe', label: 'Купе' },
  { value: 'convertible', label: 'Кабриолет' },
  { value: 'minivan', label: 'Минивэн' },
  { value: 'pickup', label: 'Пикап' }
];

const FUEL_TYPES = [
  { value: 'petrol', label: 'Бензин' },
  { value: 'diesel', label: 'Дизель' },
  { value: 'hybrid', label: 'Гибрид' },
  { value: 'electric', label: 'Электро' },
  { value: 'gas', label: 'Газ' }
];

const TRANSMISSIONS = [
  { value: 'manual', label: 'Механика' },
  { value: 'automatic', label: 'Автомат' },
  { value: 'cvt', label: 'Вариатор' },
  { value: 'robot', label: 'Робот' }
];

const CONDITIONS = [
  { value: 'new', label: 'Новый' },
  { value: 'used', label: 'Б/у' },
  { value: 'damaged', label: 'После ДТП' }
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  loading = false,
  className = ''
}) => {
  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Предустановленные периоды
  const periodPresets = {
    '7d': { label: '7 дней', days: 7 },
    '30d': { label: '30 дней', days: 30 },
    '90d': { label: '90 дней', days: 90 },
    '1y': { label: '1 год', days: 365 }
  };

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof AnalyticsFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    
    // Если выбран предустановленный период, обновляем dateRange
    if (key === 'period' && value !== 'custom') {
      const days = periodPresets[value as keyof typeof periodPresets]?.days || 30;
      newFilters.dateRange = {
        from: subDays(new Date(), days),
        to: new Date()
      };
    }
    
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const resetFilters = () => {
    const defaultFilters: AnalyticsFilters = {
      period: '30d',
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date()
      }
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.region) count++;
    if (localFilters.brand) count++;
    if (localFilters.category) count++;
    if (localFilters.priceRange?.min || localFilters.priceRange?.max) count++;
    if (localFilters.yearRange?.min || localFilters.yearRange?.max) count++;
    if (localFilters.mileageRange?.min || localFilters.mileageRange?.max) count++;
    if (localFilters.fuelType) count++;
    if (localFilters.transmission) count++;
    if (localFilters.condition) count++;
    return count;
  };

  const removeFilter = (key: keyof AnalyticsFilters) => {
    const newFilters = { ...localFilters };
    delete newFilters[key];
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Фильтры аналитики</CardTitle>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">
                {getActiveFiltersCount()} активных
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Свернуть' : 'Развернуть'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Сбросить
            </Button>
          </div>
        </div>
        <CardDescription>
          Настройте параметры для детального анализа данных
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Основные фильтры - всегда видны */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Период */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Период
            </Label>
            <Select
              value={localFilters.period}
              onValueChange={(value) => handleFilterChange('period', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 дней</SelectItem>
                <SelectItem value="30d">30 дней</SelectItem>
                <SelectItem value="90d">90 дней</SelectItem>
                <SelectItem value="1y">1 год</SelectItem>
                <SelectItem value="custom">Произвольный</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Регион */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Регион
            </Label>
            <Select
              value={localFilters.region || ''}
              onValueChange={(value) => handleFilterChange('region', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все регионы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все регионы</SelectItem>
                {REGIONS.map(region => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Бренд */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Бренд
            </Label>
            <Select
              value={localFilters.brand || ''}
              onValueChange={(value) => handleFilterChange('brand', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все бренды" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все бренды</SelectItem>
                {BRANDS.map(brand => (
                  <SelectItem key={brand.value} value={brand.value}>
                    {brand.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Произвольный диапазон дат */}
        {localFilters.period === 'custom' && (
          <div className="space-y-2">
            <Label>Диапазон дат</Label>
            <DatePickerWithRange
              date={localFilters.dateRange}
              onDateChange={(dateRange) => handleFilterChange('dateRange', dateRange)}
            />
          </div>
        )}

        {/* Расширенные фильтры */}
        {isExpanded && (
          <>
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Категория */}
              <div className="space-y-2">
                <Label>Категория</Label>
                <Select
                  value={localFilters.category || ''}
                  onValueChange={(value) => handleFilterChange('category', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все категории</SelectItem>
                    {CATEGORIES.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Тип топлива */}
              <div className="space-y-2">
                <Label>Тип топлива</Label>
                <Select
                  value={localFilters.fuelType || ''}
                  onValueChange={(value) => handleFilterChange('fuelType', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все типы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все типы</SelectItem>
                    {FUEL_TYPES.map(fuel => (
                      <SelectItem key={fuel.value} value={fuel.value}>
                        {fuel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Коробка передач */}
              <div className="space-y-2">
                <Label>Коробка передач</Label>
                <Select
                  value={localFilters.transmission || ''}
                  onValueChange={(value) => handleFilterChange('transmission', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все типы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все типы</SelectItem>
                    {TRANSMISSIONS.map(trans => (
                      <SelectItem key={trans.value} value={trans.value}>
                        {trans.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Диапазоны */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Цена */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Цена (₴)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="От"
                    value={localFilters.priceRange?.min || ''}
                    onChange={(e) => handleFilterChange('priceRange', {
                      ...localFilters.priceRange,
                      min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="До"
                    value={localFilters.priceRange?.max || ''}
                    onChange={(e) => handleFilterChange('priceRange', {
                      ...localFilters.priceRange,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                </div>
              </div>

              {/* Год выпуска */}
              <div className="space-y-2">
                <Label>Год выпуска</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="От"
                    min="1990"
                    max="2024"
                    value={localFilters.yearRange?.min || ''}
                    onChange={(e) => handleFilterChange('yearRange', {
                      ...localFilters.yearRange,
                      min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="До"
                    min="1990"
                    max="2024"
                    value={localFilters.yearRange?.max || ''}
                    onChange={(e) => handleFilterChange('yearRange', {
                      ...localFilters.yearRange,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                </div>
              </div>

              {/* Пробег */}
              <div className="space-y-2">
                <Label>Пробег (км)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="От"
                    value={localFilters.mileageRange?.min || ''}
                    onChange={(e) => handleFilterChange('mileageRange', {
                      ...localFilters.mileageRange,
                      min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="До"
                    value={localFilters.mileageRange?.max || ''}
                    onChange={(e) => handleFilterChange('mileageRange', {
                      ...localFilters.mileageRange,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Состояние */}
            <div className="space-y-2">
              <Label>Состояние</Label>
              <Select
                value={localFilters.condition || ''}
                onValueChange={(value) => handleFilterChange('condition', value || undefined)}
              >
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Все состояния" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все состояния</SelectItem>
                  {CONDITIONS.map(condition => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Активные фильтры */}
        {getActiveFiltersCount() > 0 && (
          <div className="space-y-2">
            <Label>Активные фильтры:</Label>
            <div className="flex flex-wrap gap-2">
              {localFilters.region && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Регион: {REGIONS.find(r => r.value === localFilters.region)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('region')}
                  />
                </Badge>
              )}
              {localFilters.brand && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Бренд: {BRANDS.find(b => b.value === localFilters.brand)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('brand')}
                  />
                </Badge>
              )}
              {localFilters.category && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Категория: {CATEGORIES.find(c => c.value === localFilters.category)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('category')}
                  />
                </Badge>
              )}
              {(localFilters.priceRange?.min || localFilters.priceRange?.max) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Цена: {localFilters.priceRange?.min || 0} - {localFilters.priceRange?.max || '∞'} ₴
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('priceRange')}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {getActiveFiltersCount() > 0 
              ? `Применено фильтров: ${getActiveFiltersCount()}`
              : 'Фильтры не применены'
            }
          </div>
          <Button 
            onClick={applyFilters} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Применить фильтры
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;
