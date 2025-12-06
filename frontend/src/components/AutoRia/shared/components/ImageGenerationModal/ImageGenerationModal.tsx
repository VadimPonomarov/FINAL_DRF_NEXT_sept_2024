"use client";

import React, { useState } from 'react';
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
import { 
  Camera, 
  Car, 
  Eye, 
  RotateCcw, 
  Home,
  CheckCircle2,
  Circle
} from 'lucide-react';

interface ImageType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface ImageGenerationOptions {
  imageTypes: string[];
  mode: 'add' | 'replace' | 'update';
  replaceExisting: boolean;
  onlyMissing: boolean;
  replaceEmpty: boolean;
}

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: ImageGenerationOptions) => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  title,
  description,
  isLoading = false
}) => {
  const { t } = useI18n();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    'front', 'rear', 'side', 'top', 'interior',
    'dashboard', 'engine', 'trunk', 'wheels', 'details'
  ]);
  const [mode, setMode] = useState<'add' | 'replace' | 'update'>('add');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [replaceEmpty, setReplaceEmpty] = useState(false);

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
    },
    {
      id: 'dashboard',
      name: 'Панель приборів',
      description: 'Приборна панель автомобіля',
      icon: <Camera className="h-5 w-5" />
    },
    {
      id: 'engine',
      name: 'Двигун',
      description: 'Моторний відсік',
      icon: <Car className="h-5 w-5" />
    },
    {
      id: 'trunk',
      name: 'Багажник',
      description: 'Багажний відсік',
      icon: <Home className="h-5 w-5" />
    },
    {
      id: 'wheels',
      name: 'Колеса',
      description: 'Диски та шини',
      icon: <Circle className="h-5 w-5" />
    },
    {
      id: 'details',
      name: 'Деталі',
      description: 'Додаткові деталі',
      icon: <CheckCircle2 className="h-5 w-5" />
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

  const handleGenerate = () => {
    if (selectedTypes.length === 0) {
      return;
    }

    const options: ImageGenerationOptions = {
      imageTypes: selectedTypes,
      mode,
      replaceExisting,
      onlyMissing,
      replaceEmpty
    };

    onGenerate(options);
    // Не закрываем модальное окно сразу, пусть родительский компонент управляет этим
  };

  const handleCancel = () => {
    setSelectedTypes(['front', 'side']); // Сброс к значениям по умолчанию
    setMode('add');
    setReplaceExisting(false);
    setOnlyMissing(true);
    setReplaceEmpty(false);
    onClose();
  };

  const allSelected = selectedTypes.length === imageTypes.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[480px] max-h-[75vh] overflow-y-auto sm:w-full p-3 sm:p-4">
        <DialogHeader className="pb-2 sm:pb-3">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="h-4 w-4 text-blue-600" />
            {title || 'Генерация изображений'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {description || 'Выберите типы изображений для генерации'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Кнопка "Выбрать все" */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {t('autoria.testAds.imageTypes.title') || 'Типи зображень:'}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-700 text-xs"
            >
              {allSelected ? 'Зняти все' : t('autoria.testAds.imageTypes.selectAll') || 'Обрати все'}
            </Button>
          </div>

          {/* Список типов изображений */}
          <div className="grid gap-2">
            {imageTypes.map((type) => {
              const isSelected = selectedTypes.includes(type.id);
              
              return (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTypeToggle(type.id)}
                >
                  <CardContent className="p-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
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
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}
                        >
                          {type.name}
                        </Label>
                        <p className={`text-xs mt-0.5 ${
                          isSelected ? 'text-blue-700' : 'text-gray-600'
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

          {/* Информация о выборе */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              Обрано: <span className="font-medium">{selectedTypes.length}</span> з {imageTypes.length} типів
            </p>
          </div>

          {/* Дополнительные опции */}
          <div className="space-y-2 border-t pt-3">
            <Label className="text-sm font-medium">Опції генерації:</Label>

            {/* Режим обработки */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium text-gray-700">Режим обробки:</Label>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="mode-add"
                    name="mode"
                    value="add"
                    checked={mode === 'add'}
                    onChange={(e) => setMode(e.target.value as 'add' | 'replace' | 'update')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label htmlFor="mode-add" className="text-sm cursor-pointer">
                    Додати нові зображення (не замінювати існуючі)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="mode-replace"
                    name="mode"
                    value="replace"
                    checked={mode === 'replace'}
                    onChange={(e) => setMode(e.target.value as 'add' | 'replace' | 'update')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label htmlFor="mode-replace" className="text-sm cursor-pointer">
                    Замінити всі існуючі зображення
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="mode-update"
                    name="mode"
                    value="update"
                    checked={mode === 'update'}
                    onChange={(e) => setMode(e.target.value as 'add' | 'replace' | 'update')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label htmlFor="mode-update" className="text-sm cursor-pointer">
                    Оновити існуючі + додати відсутні
                  </Label>
                </div>
              </div>
            </div>

            {/* Дополнительные чекбоксы */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="only-missing"
                  checked={onlyMissing}
                  onChange={(e) => setOnlyMissing(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <Label htmlFor="only-missing" className="text-sm cursor-pointer">
                  Генерувати тільки відсутні типи зображень
                </Label>
              </div>

              {mode !== 'add' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="replace-existing"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <Label htmlFor="replace-existing" className="text-sm cursor-pointer">
                    Замінити існуючі зображення обраних типів
                  </Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="replace-empty"
                  checked={replaceEmpty}
                  onChange={(e) => setReplaceEmpty(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <Label htmlFor="replace-empty" className="text-sm cursor-pointer">
                  🔄 Замінити пусті/пошкоджені зображення
                </Label>
              </div>
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
            disabled={selectedTypes.length === 0 || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Генеруємо...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {t('autoria.testAds.imageTypes.generate') || 'Генерувати'} ({selectedTypes.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageGenerationModal;
