"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  Image, 
  Trash2, 
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

export interface ExistingAdsAction {
  id: string;
  key: string;
  icon: React.ReactNode;
  description: string;
  dangerous?: boolean;
}

interface ExistingAdsManagerProps {
  adsCount: number;
  onProcess: (selectedActions: string[], imageTypes: string[]) => void;
  isProcessing?: boolean;
  className?: string;
}

const ExistingAdsManager: React.FC<ExistingAdsManagerProps> = ({
  adsCount,
  onProcess,
  isProcessing = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedImageTypes, setSelectedImageTypes] = useState<string[]>(['front', 'side']);

  const actions: ExistingAdsAction[] = [
    {
      id: 'addImages',
      key: 'addImages',
      icon: <Image className="h-5 w-5" />,
      description: t('autoria.testAds.existingAds.addImages')
    },
    {
      id: 'removeEmpty',
      key: 'removeEmpty',
      icon: <Trash2 className="h-5 w-5" />,
      description: t('autoria.testAds.existingAds.removeEmpty')
    },
    {
      id: 'rewriteRecords',
      key: 'rewriteRecords',
      icon: <RotateCcw className="h-5 w-5" />,
      description: t('autoria.testAds.existingAds.rewriteRecords'),
      dangerous: true
    }
  ];

  const imageTypes = [
    { id: 'front', label: t('autoria.testAds.imageTypes.front') },
    { id: 'rear', label: t('autoria.testAds.imageTypes.rear') },
    { id: 'side', label: t('autoria.testAds.imageTypes.side') },
    { id: 'top', label: t('autoria.testAds.imageTypes.top') },
    { id: 'interior', label: t('autoria.testAds.imageTypes.interior') }
  ];

  const handleActionToggle = (actionId: string) => {
    setSelectedActions(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const handleImageTypeToggle = (typeId: string) => {
    setSelectedImageTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleProcess = () => {
    if (selectedActions.length === 0) {
      toast({ title: t('common.warning'), description: t('autoria.testAds.existingAds.noOptions'), variant: 'destructive' });
      return;
    }

    // Если выбрано добавление изображений, проверяем типы
    if (selectedActions.includes('addImages') && selectedImageTypes.length === 0) {
      toast({ title: t('common.warning'), description: t('autoria.testAds.imageTypes.noSelection'), variant: 'destructive' });
      return;
    }

    onProcess(selectedActions, selectedImageTypes);
  };

  const hasImageActions = selectedActions.includes('addImages') || selectedActions.includes('rewriteRecords');

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          {t('autoria.testAds.existingAds.title')}
        </CardTitle>
        <p className="text-sm text-orange-700">
          {t('autoria.testAds.existingAds.found', { count: adsCount })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions Selection */}
        <div>
          <Label className="text-base font-medium text-orange-800 mb-3 block">
            {t('autoria.testAds.existingAds.options')}
          </Label>
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-orange-100/50 ${
                  selectedActions.includes(action.id) 
                    ? 'bg-orange-100 border-orange-300' 
                    : 'border-orange-200 bg-white'
                } ${action.dangerous ? 'border-red-300' : ''}`}
                onClick={() => handleActionToggle(action.id)}
              >
                <Checkbox
                  id={action.id}
                  checked={selectedActions.includes(action.id)}
                  onCheckedChange={() => handleActionToggle(action.id)}
                />
                <div className="flex items-center space-x-2 flex-1">
                  <div className={`${action.dangerous ? 'text-red-600' : 'text-orange-600'}`}>
                    {action.icon}
                  </div>
                  <Label 
                    htmlFor={action.id}
                    className={`cursor-pointer flex-1 ${action.dangerous ? 'text-red-700' : 'text-orange-700'}`}
                  >
                    {action.description}
                  </Label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image Types Selection (показываем только если нужны изображения) */}
        {hasImageActions && (
          <div className="border-t border-orange-200 pt-4">
            <Label className="text-base font-medium text-orange-800 mb-3 block">
              {t('autoria.testAds.imageTypes.title')}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {imageTypes.map((type) => (
                <div
                  key={type.id}
                  className={`flex items-center space-x-2 p-2 rounded border cursor-pointer hover:bg-orange-100/50 ${
                    selectedImageTypes.includes(type.id) 
                      ? 'bg-orange-100 border-orange-300' 
                      : 'border-orange-200 bg-white'
                  }`}
                  onClick={() => handleImageTypeToggle(type.id)}
                >
                  <Checkbox
                    id={`img-${type.id}`}
                    checked={selectedImageTypes.includes(type.id)}
                    onCheckedChange={() => handleImageTypeToggle(type.id)}
                  />
                  <Label 
                    htmlFor={`img-${type.id}`}
                    className="cursor-pointer text-sm text-orange-700"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Process Button */}
        <div className="pt-4">
          <Button
            onClick={handleProcess}
            disabled={isProcessing || selectedActions.length === 0}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('autoria.testAds.existingAds.processing')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Обработать существующие объявления
              </>
            )}
          </Button>
        </div>

        {/* Selected Actions Preview */}
        {selectedActions.length > 0 && (
          <div className="pt-2 border-t border-orange-200">
            <p className="text-sm text-orange-700 mb-2">
              Выбранные действия:
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedActions.map(actionId => {
                const action = actions.find(a => a.id === actionId);
                return action ? (
                  <span
                    key={actionId}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                      action.dangerous 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {action.icon}
                    {action.description}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExistingAdsManager;
