"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Search, 
  Filter, 
  Car, 
  MapPin, 
  Calendar, 
  Fuel, 
  Settings,
  Eye,
  Heart,
  Phone,
  MessageCircle,
  ChevronDown,
  Grid,
  List,
  SortAsc
} from 'lucide-react';

// 🚗 Интерфейс для объявления
interface CarAd {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  mileage: number;
  fuelType: string;
  transmission: string;
  location: string;
  images: string[];
  views: number;
  isUrgent: boolean;
  isPremium: boolean;
  createdAt: string;
  seller: {
    name: string;
    phone: string;
    isDealer: boolean;
  };
}

// 🎯 Фильтры поиска
interface SearchFilters {
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  priceFrom: number;
  priceTo: number;
  region: string;
  city: string;
  fuelType: string;
  transmission: string;
  mileageFrom: number;
  mileageTo: number;
}

const SearchPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showFilters, setShowFilters] = useState(true);
  
  // 🔍 Состояние фильтров
  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    priceFrom: 5000,
    priceTo: 50000,
    yearFrom: 2010,
    yearTo: 2024
  });

  // 📊 Моковые данные объявлений
  const mockAds: any[] = [
    {
      id: '1',
      title: '🚗 BMW X5 2020 - Идеальное состояние',
      brand: 'BMW',
      model: 'X5',
      year: 2020,
      price: 45000,
      currency: 'USD',
      mileage: 35000,
      fuelType: 'Бензин',
      transmission: 'Автомат',
      location: 'Киев',
      images: ['/api/placeholder/400/300'],
      views: 1234,
      isUrgent: true,
      isPremium: true,
      createdAt: '2024-01-15',
      seller: {
        name: 'Александр',
        phone: '+380501234567',
        isDealer: false
      }
    },
    {
      id: '2',
      title: '🏎️ Mercedes-Benz C-Class 2019',
      brand: 'Mercedes-Benz',
      model: 'C-Class',
      year: 2019,
      price: 35000,
      currency: 'USD',
      mileage: 45000,
      fuelType: 'Дизель',
      transmission: 'Автомат',
      location: 'Львов',
      images: ['/api/placeholder/400/300'],
      views: 856,
      isUrgent: false,
      isPremium: false,
      createdAt: '2024-01-14',
      seller: {
        name: 'AutoSalon Premium',
        phone: '+380671234567',
        isDealer: true
      }
    },
    {
      id: '3',
      title: '🚙 Toyota RAV4 2021 - Гибрид',
      brand: 'Toyota',
      model: 'RAV4',
      year: 2021,
      price: 32000,
      currency: 'USD',
      mileage: 25000,
      fuelType: 'Гибрид',
      transmission: 'Автомат',
      location: 'Одесса',
      images: ['/api/placeholder/400/300'],
      views: 567,
      isUrgent: false,
      isPremium: true,
      createdAt: '2024-01-13',
      seller: {
        name: 'Мария',
        phone: '+380931234567',
        isDealer: false
      }
    }
  ];

  // 🎨 Опции для фильтров
  const brandOptions = ['BMW', 'Mercedes-Benz', 'Toyota', 'Volkswagen', 'Audi'];
  const fuelOptions = ['Бензин', 'Дизель', 'Гибрид', 'Электро', 'ГБО'];
  const transmissionOptions = ['Механика', 'Автомат', 'Вариатор'];
  const sortOptions = [
    { value: 'date_desc', label: '📅 Сначала новые' },
    { value: 'date_asc', label: '📅 Сначала старые' },
    { value: 'price_asc', label: '💰 Сначала дешевые' },
    { value: 'price_desc', label: '💰 Сначала дорогие' },
    { value: 'mileage_asc', label: '🛣️ Меньше пробег' },
    { value: 'year_desc', label: '🗓️ Сначала новее' }
  ];

  // 💰 Форматирование цены
  const formatPrice = (price: number, currency: string) => {
    const symbols = { USD: '$', EUR: '€', UAH: '₴' };
    return `${symbols[currency as keyof typeof symbols] || '$'}${price.toLocaleString()}`;
  };

  // 📱 Карточка объявления
  const AdCard: React.FC<{ ad: any }> = ({ ad }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* 🖼️ Изображение */}
      <div className="relative">
        <img 
          src={Array.isArray(ad.images) && ad.images[0] 
            ? (ad.images[0].image_display_url || ad.images[0].image_url || ad.images[0].url || ad.images[0].image || '/api/placeholder/400/300')
            : '/api/placeholder/400/300'} 
          alt={ad.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/api/placeholder/400/300') {
              target.src = '/api/placeholder/400/300';
            }
          }}
        />
        
        {/* 🏷️ Бейджи */}
        <div className="absolute top-2 left-2 flex gap-2">
          {ad.isUrgent && (
            <Badge className="bg-red-500 text-white">🔥 Срочно</Badge>
          )}
          {ad.isPremium && (
            <Badge className="bg-gold-500 text-white">💎 Премиум</Badge>
          )}
        </div>
        
        {/* ❤️ Избранное */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
        >
          <Heart className="h-4 w-4" />
        </Button>
        
        {/* 👁️ Просмотры */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {ad.views}
        </div>
      </div>

      <CardContent className="p-4">
        {/* 📝 Заголовок */}
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {ad.title}
        </h3>
        
        {/* 💰 Цена */}
        <div className="text-2xl font-bold text-green-600 mb-3 text-right tabular-nums">
          {formatPrice(ad.price, ad.currency)}
        </div>
        
        {/* 📊 Характеристики */}
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{ad.year} год</span>
            <span>•</span>
            <span>{ad.mileage.toLocaleString()} км</span>
          </div>
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            <span>{ad.fuelType}</span>
            <span>•</span>
            <span>{ad.transmission}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{ad.location}</span>
          </div>
        </div>
        
        {/* 👤 Продавец */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              {ad.seller.isDealer ? '🏢' : '👤'}
            </div>
            <div>
              <div className="font-medium text-sm">{ad.seller.name}</div>
              {ad.seller.isDealer && (
                <Badge variant="outline" className="text-xs">Автосалон</Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Phone className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* 🔍 Заголовок и поиск */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            🔍 Поиск автомобилей
          </h1>
          
          {/* 🔍 Строка поиска */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Поиск по марке, модели, VIN..."
                className="pl-10"
              />
            </div>
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Найти
            </Button>
          </div>
          
          {/* 🎛️ Быстрые фильтры */}
          <div className="flex flex-wrap gap-4">
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="🚗 Марка" />
              </SelectTrigger>
              <SelectContent>
                {brandOptions.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="🏎️ Модель" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="x5">X5</SelectItem>
                <SelectItem value="c-class">C-Class</SelectItem>
                <SelectItem value="rav4">RAV4</SelectItem>
              </SelectContent>
            </Select>
            
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="🌍 Регион" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kyiv">Киев</SelectItem>
                <SelectItem value="lviv">Львов</SelectItem>
                <SelectItem value="odesa">Одесса</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Все фильтры
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* 🎛️ Боковая панель фильтров */}
          {showFilters && (
            <div className="w-80 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🎛️ Фильтры
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* 💰 Цена */}
                  <div className="space-y-3">
                    <Label>💰 Цена (USD)</Label>
                    <div className="px-2">
                      <Slider
                        value={[filters.priceFrom || 5000, filters.priceTo || 50000]}
                        onValueChange={([from, to]) => {
                          setFilters(prev => ({ ...prev, priceFrom: from, priceTo: to }));
                        }}
                        max={100000}
                        min={1000}
                        step={1000}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>${filters.priceFrom?.toLocaleString()}</span>
                      <span>${filters.priceTo?.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* 📅 Год выпуска */}
                  <div className="space-y-3">
                    <Label>📅 Год выпуска</Label>
                    <div className="px-2">
                      <Slider
                        value={[filters.yearFrom || 2010, filters.yearTo || 2024]}
                        onValueChange={([from, to]) => {
                          setFilters(prev => ({ ...prev, yearFrom: from, yearTo: to }));
                        }}
                        max={2024}
                        min={1990}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{filters.yearFrom}</span>
                      <span>{filters.yearTo}</span>
                    </div>
                  </div>
                  
                  {/* ⛽ Тип топлива */}
                  <div className="space-y-3">
                    <Label>⛽ Тип топлива</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelOptions.map(fuel => (
                          <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* ⚙️ Коробка передач */}
                  <div className="space-y-3">
                    <Label>⚙️ Коробка передач</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        {transmissionOptions.map(trans => (
                          <SelectItem key={trans} value={trans}>{trans}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button className="w-full">
                    🔍 Применить фильтры
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    🗑️ Сбросить фильтры
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 📋 Результаты поиска */}
          <div className="flex-1 space-y-6">
            
            {/* 📊 Заголовок результатов */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    📊 Найдено {mockAds.length} объявлений
                  </h2>
                  <p className="text-gray-600">
                    Показаны результаты по вашим критериям
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* 🔄 Сортировка */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SortAsc className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option: any) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* 👁️ Режим просмотра */}
                  <div className="flex border rounded-lg">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 🚗 Список объявлений */}
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {mockAds.map((ad: any) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
            
            {/* 📄 Пагинация */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm">Предыдущая</Button>
                <Button variant="default" size="sm">1</Button>
                <Button variant="outline" size="sm">2</Button>
                <Button variant="outline" size="sm">3</Button>
                <Button variant="outline" size="sm">Следующая</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
