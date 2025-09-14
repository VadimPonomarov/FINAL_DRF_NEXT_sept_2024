"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wand2, 
  Car, 
  Palette, 
  Calendar,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import CarImageGenerator from '@/components/AutoRia/Components/CarImageGenerator';
import { CarImageParams } from '@/services/carImageGenerator.service';

const CarImageGeneratorDemo = () => {
  const [carParams, setCarParams] = useState<CarImageParams>({
    brand: 'BMW',
    model: 'X5',
    year: 2020,
    color: 'black',
    condition: 'excellent',
    bodyType: 'suv'
  });

  const [showGenerator, setShowGenerator] = useState(false);

  const handleParamChange = (key: keyof CarImageParams, value: string | number) => {
    setCarParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const generateImages = () => {
    setShowGenerator(true);
  };

  const presetCars = [
    {
      name: 'BMW X5 2020',
      params: { brand: 'BMW', model: 'X5', year: 2020, color: 'black', condition: 'excellent' as const, bodyType: 'suv' }
    },
    {
      name: 'Mercedes E-Class 2019',
      params: { brand: 'Mercedes-Benz', model: 'E-Class', year: 2019, color: 'silver', condition: 'good' as const, bodyType: 'sedan' }
    },
    {
      name: 'Toyota Camry 2021',
      params: { brand: 'Toyota', model: 'Camry', year: 2021, color: 'white', condition: 'excellent' as const, bodyType: 'sedan' }
    },
    {
      name: 'Volkswagen Golf 2018',
      params: { brand: 'Volkswagen', model: 'Golf', year: 2018, color: 'blue', condition: 'good' as const, bodyType: 'hatchback' }
    },
    {
      name: 'Ford Transit 2020',
      params: { brand: 'Ford', model: 'Transit', year: 2020, color: 'white', condition: 'good' as const, bodyType: 'van' }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Wand2 className="h-8 w-8 text-purple-600" />
            Генератор изображений автомобилей
          </h1>
          <p className="text-slate-600">
            Демонстрация автоматической генерации изображений автомобилей на основе параметров
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Панель управления */}
          <div className="lg:col-span-1 space-y-6">
            {/* Параметры автомобиля */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Параметры автомобиля
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="brand">Марка</Label>
                  <Input
                    id="brand"
                    value={carParams.brand}
                    onChange={(e) => handleParamChange('brand', e.target.value)}
                    placeholder="BMW, Mercedes, Toyota..."
                  />
                </div>

                <div>
                  <Label htmlFor="model">Модель</Label>
                  <Input
                    id="model"
                    value={carParams.model}
                    onChange={(e) => handleParamChange('model', e.target.value)}
                    placeholder="X5, E-Class, Camry..."
                  />
                </div>

                <div>
                  <Label htmlFor="year">Год</Label>
                  <Input
                    id="year"
                    type="number"
                    value={carParams.year}
                    onChange={(e) => handleParamChange('year', parseInt(e.target.value))}
                    min="1990"
                    max="2024"
                  />
                </div>

                <div>
                  <Label htmlFor="color">Цвет</Label>
                  <Select value={carParams.color} onValueChange={(value) => handleParamChange('color', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="black">Черный</SelectItem>
                      <SelectItem value="white">Белый</SelectItem>
                      <SelectItem value="silver">Серебристый</SelectItem>
                      <SelectItem value="gray">Серый</SelectItem>
                      <SelectItem value="red">Красный</SelectItem>
                      <SelectItem value="blue">Синий</SelectItem>
                      <SelectItem value="green">Зеленый</SelectItem>
                      <SelectItem value="yellow">Желтый</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="condition">Состояние</Label>
                  <Select value={carParams.condition} onValueChange={(value) => handleParamChange('condition', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Отличное</SelectItem>
                      <SelectItem value="good">Хорошее</SelectItem>
                      <SelectItem value="fair">Удовлетворительное</SelectItem>
                      <SelectItem value="poor">Плохое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bodyType">Тип кузова</Label>
                  <Select value={carParams.bodyType} onValueChange={(value) => handleParamChange('bodyType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">Седан</SelectItem>
                      <SelectItem value="hatchback">Хэтчбек</SelectItem>
                      <SelectItem value="suv">Внедорожник</SelectItem>
                      <SelectItem value="coupe">Купе</SelectItem>
                      <SelectItem value="wagon">Универсал</SelectItem>
                      <SelectItem value="convertible">Кабриолет</SelectItem>
                      <SelectItem value="pickup">Пикап</SelectItem>
                      <SelectItem value="van">Фургон</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={generateImages}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Сгенерировать изображения
                </Button>
              </CardContent>
            </Card>

            {/* Готовые пресеты */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Готовые примеры
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {presetCars.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setCarParams(preset.params);
                      setShowGenerator(true);
                    }}
                  >
                    <Car className="h-4 w-4 mr-2" />
                    {preset.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Область генерации */}
          <div className="lg:col-span-2">
            {showGenerator ? (
              <CarImageGenerator
                carParams={carParams}
                showExtended={true}
                onImagesGenerated={(images) => {
                  console.log('Generated images:', images);
                }}
              />
            ) : (
              <Card className="h-96">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Wand2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">
                      Готов к генерации
                    </h3>
                    <p className="text-slate-500">
                      Настройте параметры автомобиля и нажмите "Сгенерировать изображения"
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Информация о генераторе */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-blue-900 mb-2">Множество ракурсов</h4>
                <p className="text-sm text-blue-800">
                  Генерация изображений спереди, сзади, сбоку, салона, двигателя и панели приборов
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Palette className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-blue-900 mb-2">Настройка параметров</h4>
                <p className="text-sm text-blue-800">
                  Учет марки, модели, года, цвета, состояния и типа кузова автомобиля
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Download className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-blue-900 mb-2">Готовые изображения</h4>
                <p className="text-sm text-blue-800">
                  Скачивание в SVG формате для использования в объявлениях
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CarImageGeneratorDemo;
