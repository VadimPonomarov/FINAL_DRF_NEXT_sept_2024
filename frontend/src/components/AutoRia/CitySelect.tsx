import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useTranslation } from '@/contexts/I18nContext';

interface City {
  id: number;
  name: string;
  region_name?: string;
}

interface CitySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  regionId?: string;
}

export const CitySelect: React.FC<CitySelectProps> = ({
  value,
  onValueChange,
  placeholder,
  regionId
}) => {
  const t = useTranslation();
  const defaultPlaceholder = placeholder || t('selectCity');
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Кэш городов на уровне модуля
  const [citiesCache] = useState(() => new Map<string, City[]>());

  // Загружаем города при изменении региона или первом открытии
  const loadCities = async () => {
    if (!regionId) {
      setCities([]);
      return;
    }

    // Проверяем кэш
    const cacheKey = `cities_${regionId}`;
    const cached = citiesCache.get(cacheKey);
    if (cached) {
      setCities(cached);
      return;
    }

    setLoading(true);
    try {
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev && process.env.NEXT_PUBLIC_DEBUG_FETCH !== 'true') {
        // В dev режиме используем моковые данные
        const mockCities = [
          { id: 1, name: 'Київ', region_name: 'Київська область' },
          { id: 2, name: 'Львів', region_name: 'Львівська область' },
          { id: 3, name: 'Одеса', region_name: 'Одеська область' },
          { id: 4, name: 'Харків', region_name: 'Харківська область' },
          { id: 5, name: 'Дніпро', region_name: 'Дніпропетровська область' },
        ];
        setCities(mockCities);
        citiesCache.set(cacheKey, mockCities);
        return;
      }

      const response = await fetch(`/api/public/reference/cities?region_id=${regionId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // API возвращает {options: [...], hasMore: false, total: N}
      const citiesList = data.options || [];

      // Преобразуем в нужный формат
      const transformedCities = citiesList.map((city: any) => ({
        id: parseInt(city.value) || city.id,
        name: city.label || city.name,
        region_name: city.region_name
      }));
      
      console.log('[CitySelect] Transformed cities:', transformedCities);
      setCities(transformedCities);
    } catch (error) {
      console.error('[CitySelect] Error loading cities:', error);
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем города при изменении региона
  useEffect(() => {
    if (regionId) {
      loadCities();
    } else {
      setCities([]);
    }
    // Очищаем выбранный город при смене региона
    if (value) {
      onValueChange('');
    }
  }, [regionId]);

  // Фильтруем города по поисковому запросу
  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Находим выбранный город
  const selectedCity = cities.find(city => city.id.toString() === value);

  return (
    <Select 
      value={value || ''} 
      onValueChange={onValueChange}
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open && regionId && cities.length === 0) {
          loadCities(); // Загружаем при открытии, если есть регион
        }
      }}
      disabled={!regionId}
    >
      <SelectTrigger>
        <SelectValue placeholder={regionId ? (placeholder || t('selectCity')) : t('selectRegionFirst')}>
          {selectedCity ? selectedCity.name : (regionId ? (placeholder || t('selectCity')) : t('selectRegionFirst'))}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Поле поиска */}
        {regionId && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('searchCity')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
        
        {/* Список городов */}
        <div className="max-h-60 overflow-y-auto">
          {!regionId ? (
            <div className="p-4 text-center text-gray-500">
              {t('selectRegionFirst')}
            </div>
          ) : loading ? (
            <div className="p-4 text-center text-gray-500">
              {t('loading')}
            </div>
          ) : filteredCities.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {t('nothingFound')}
            </div>
          ) : (
            filteredCities.map((city) => (
              <SelectItem key={city.id} value={city.id.toString()}>
                {city.name}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
};
