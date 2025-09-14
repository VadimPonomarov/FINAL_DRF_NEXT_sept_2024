import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useTranslation } from '@/contexts/I18nContext';

interface Region {
  id: number;
  name: string;
  code?: string;
}

interface RegionSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const RegionSelect: React.FC<RegionSelectProps> = ({
  value,
  onValueChange,
  placeholder
}) => {
  const t = useTranslation();
  const defaultPlaceholder = placeholder || t('selectRegion');
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Кэш регионов на уровне модуля для избежания повторных запросов
  const [regionsCache] = useState(() => new Map<string, Region[]>());

  // Загружаем регионы при первом открытии
  const loadRegions = async () => {
    if (regions.length > 0) return; // Уже загружены

    // Проверяем кэш
    const cached = regionsCache.get('regions');
    if (cached) {
      setRegions(cached);
      return;
    }

    setLoading(true);
    try {
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev && process.env.NEXT_PUBLIC_DEBUG_FETCH !== 'true') {
        // В dev режиме используем моковые данные для ускорения
        const mockRegions = [
          { id: 1, name: 'Київська область', code: 'KV' },
          { id: 2, name: 'Львівська область', code: 'LV' },
          { id: 3, name: 'Одеська область', code: 'OD' },
          { id: 4, name: 'Харківська область', code: 'KH' },
          { id: 5, name: 'Дніпропетровська область', code: 'DP' },
        ];
        setRegions(mockRegions);
        regionsCache.set('regions', mockRegions);
        return;
      }

      const response = await fetch('/api/public/reference/regions?page=1&page_size=50');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Обрабатываем ответ
      const regionsList = data.options || data.results || data || [];
      
      // Преобразуем в нужный формат
      const transformedRegions = regionsList.map((region: any) => ({
        id: region.value || region.id,
        name: region.label || region.name,
        code: region.code
      }));
      
      setRegions(transformedRegions);
      regionsCache.set('regions', transformedRegions); // Кэшируем результат
    } catch (error) {
      console.error('[RegionSelect] Error loading regions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтруем регионы по поисковому запросу
  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Находим выбранный регион
  const selectedRegion = regions.find(region => region.id.toString() === value);

  return (
    <Select 
      value={value || ''} 
      onValueChange={onValueChange}
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          loadRegions(); // Загружаем при открытии
        }
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={defaultPlaceholder}>
          {selectedRegion ? selectedRegion.name : defaultPlaceholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Поле поиска */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('searchRegion')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        
        {/* Список регионов */}
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              {t('loading')}
            </div>
          ) : filteredRegions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? t('nothingFound') : t('noRegions')}
            </div>
          ) : (
            filteredRegions.map((region) => (
              <SelectItem key={region.id} value={region.id.toString()}>
                {region.name}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
};
