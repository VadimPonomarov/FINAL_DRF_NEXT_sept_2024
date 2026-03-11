"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Camera, 
  Car, 
  Eye, 
  RotateCcw, 
  Home,
  CheckCircle2,
  Circle,
  Database,
  Plus,
  Minus
} from 'lucide-react';
import {
  MAX_ADS_COUNT,
  MIN_ADS_COUNT,
  DEFAULT_ADS_COUNT,
} from '@/shared/constants/testAds.constants';
import {
  BASIC_IMAGE_TYPES,
  DEFAULT_IMAGE_TYPES,
  IMAGE_TYPE_IDS,
} from '@/shared/constants/imageGeneration.constants';

interface ImageType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface TestAdsGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (count: number, imageTypes: string[]) => void;
  isLoading?: boolean;
}

const TestAdsGenerationModal: React.FC<TestAdsGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false
}) => {
  const { t } = useI18n();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...DEFAULT_IMAGE_TYPES]);
  const [count, setCount] = useState(DEFAULT_ADS_COUNT);
  const isGeneratingRef = useRef(false);

  const imageTypes: ImageType[] = [
    {
      id: 'front',
      name: t('autoria.testAds.imageTypes.front') || 'Вид спереди',
      description: 'Передня частина автомобіля',
      icon: <Car className="h-5 w-5" />
    },
    {
      id: 'rear',
      name: t('autoria.testAds.imageTypes.rear') || 'Вид ззаду',
      description: 'Задня частина автомобіля',
      icon: <RotateCcw className="h-5 w-5" />
    },
    {
      id: 'side',
      name: t('autoria.testAds.imageTypes.side') || 'Вид збоку',
      description: 'Боковий профіль автомобіля',
      icon: <Eye className="h-5 w-5" />
    },
    {
      id: 'top',
      name: t('autoria.testAds.imageTypes.top') || 'Вид зверху',
      description: 'Автомобіль зверху',
      icon: <Camera className="h-5 w-5" />
    },
    {
      id: 'interior',
      name: t('autoria.testAds.imageTypes.interior') || 'Інтер\'єр',
      description: 'Салон автомобіля',
      icon: <Home className="h-5 w-5" />
    }
  ];

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTypes.length === imageTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(imageTypes.map(type => type.id));
    }
  };

  const handleCountChange = (newCount: number) => {
    if (newCount >= MIN_ADS_COUNT && newCount <= MAX_ADS_COUNT) {
      setCount(newCount);
    }
  };

  const handleGenerate = useCallback(() => {
    if (selectedTypes.length === 0) {
      return;
    }
    if (count < MIN_ADS_COUNT || count > MAX_ADS_COUNT) {
      return;
    }
    if (isLoading) {
      return; // Prevent multiple clicks during loading
    }
    if (isGeneratingRef.current) {
      return; // Debounce protection
    }
    
    isGeneratingRef.current = true;
    onGenerate(count, selectedTypes);
    
    // Reset ref after a short delay to allow future clicks
    setTimeout(() => {
      isGeneratingRef.current = false;
    }, 1000);
  }, [selectedTypes, count, isLoading, onGenerate]);

  const handleCancel = () => {
    setSelectedTypes([...DEFAULT_IMAGE_TYPES]);
    setCount(DEFAULT_ADS_COUNT);
    onClose();
  };

  const allSelected = selectedTypes.length === imageTypes.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[480px] max-h-[75vh] overflow-y-auto sm:w-full p-3 sm:p-4">
        <DialogHeader className="pb-2 sm:pb-3">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Database className="h-4 w-4 text-green-600" />
            🔄 Генерація тестових оголошень (Reverse-Cascade)
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Новий алгоритм: Модель→Марка→Тип. Налаштуйте параметри для створення тестових оголошень з правильними каскадними зв'язками
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Количество объявлений */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Кількість оголошень:</Label>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCountChange(count - 1)}
                disabled={count <= MIN_ADS_COUNT}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min={MIN_ADS_COUNT}
                  max={MAX_ADS_COUNT}
                  value={count}
                  onChange={(e) => handleCountChange(parseInt(e.target.value) || 1)}
                  className="w-20 text-center"
                />
                <span className="text-sm text-gray-600">оголошень</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCountChange(count + 1)}
                disabled={count >= MAX_ADS_COUNT}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">Від {MIN_ADS_COUNT} до {MAX_ADS_COUNT} оголошень</p>
          </div>

          {/* Типы изображений */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Типи зображень:
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-700"
              >
                {allSelected ? 'Зняти все' : 'Обрати все'}
              </Button>
            </div>

            <div className="grid gap-3">
              {imageTypes.map((type) => {
                const isSelected = selectedTypes.includes(type.id);
                
                return (
                  <Card 
                    key={type.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected 
                        ? 'border-green-500 bg-green-50 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTypeToggle(type.id)}
                  >
                    <CardContent className="p-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-shrink-0 text-gray-600">
                          <div className="h-4 w-4">
                            {type.icon}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <Label
                            className={`text-sm font-medium cursor-pointer block ${
                              isSelected ? 'text-green-900' : 'text-gray-900'
                            }`}
                          >
                            {type.name}
                          </Label>
                          <p className={`text-xs mt-0.5 ${
                            isSelected ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                Буде створено: <span className="font-medium">{count}</span> оголошень з <span className="font-medium">{selectedTypes.length}</span> типами зображень
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Загалом зображень: ~{count * selectedTypes.length}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Скасувати
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={selectedTypes.length === 0 || count < MIN_ADS_COUNT || count > MAX_ADS_COUNT || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Створюємо...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Створити ({count})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestAdsGenerationModal;
