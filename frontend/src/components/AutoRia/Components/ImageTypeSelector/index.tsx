"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Car, 
  Eye, 
  RotateCcw, 
  ArrowUp, 
  Home,
  CheckSquare,
  Square
} from 'lucide-react';

export interface ImageType {
  id: string;
  key: string;
  icon: React.ReactNode;
  description: string;
}

interface ImageTypeSelectorProps {
  onGenerate: (selectedTypes: string[]) => void;
  isGenerating?: boolean;
  className?: string;
}

const ImageTypeSelector: React.FC<ImageTypeSelectorProps> = ({
  onGenerate,
  isGenerating = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const imageTypes: ImageType[] = [
    {
      id: 'front',
      key: 'front',
      icon: <Car className="h-5 w-5" />,
      description: t('autoria.testAds.imageTypes.front')
    },
    {
      id: 'rear',
      key: 'rear', 
      icon: <RotateCcw className="h-5 w-5" />,
      description: t('autoria.testAds.imageTypes.rear')
    },
    {
      id: 'side',
      key: 'side',
      icon: <Eye className="h-5 w-5" />,
      description: t('autoria.testAds.imageTypes.side')
    },
    {
      id: 'top',
      key: 'top',
      icon: <ArrowUp className="h-5 w-5" />,
      description: t('autoria.testAds.imageTypes.top')
    },
    {
      id: 'interior',
      key: 'interior',
      icon: <Home className="h-5 w-5" />,
      description: t('autoria.testAds.imageTypes.interior')
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
      toast({ title: t('common.warning'), description: t('autoria.testAds.imageTypes.noSelection'), variant: 'destructive' });
      return;
    }
    onGenerate(selectedTypes);
  };

  const allSelected = selectedTypes.length === imageTypes.length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {t('autoria.testAds.imageTypes.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Select All Button */}
        <div className="flex items-center space-x-2 pb-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex items-center gap-2"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {t('autoria.testAds.imageTypes.selectAll')}
          </Button>
          <span className="text-sm text-muted-foreground">
            ({selectedTypes.length}/{imageTypes.length})
          </span>
        </div>

        {/* Image Type Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {imageTypes.map((type) => (
            <div
              key={type.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 ${
                selectedTypes.includes(type.id) 
                  ? 'bg-accent border-primary' 
                  : 'border-border'
              }`}
              onClick={() => handleTypeToggle(type.id)}
            >
              <Checkbox
                id={type.id}
                checked={selectedTypes.includes(type.id)}
                onCheckedChange={() => handleTypeToggle(type.id)}
              />
              <div className="flex items-center space-x-2 flex-1">
                <div className="text-muted-foreground">
                  {type.icon}
                </div>
                <Label 
                  htmlFor={type.id}
                  className="cursor-pointer flex-1"
                >
                  {type.description}
                </Label>
              </div>
            </div>
          ))}
        </div>

        {/* Generate Button */}
        <div className="pt-4">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedTypes.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('autoria.testAds.creating')}
              </>
            ) : (
              <>
                <Car className="h-4 w-4 mr-2" />
                {t('autoria.testAds.imageTypes.generate')}
              </>
            )}
          </Button>
        </div>

        {/* Selected Types Preview */}
        {selectedTypes.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Выбранные типы изображений:
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedTypes.map(typeId => {
                const type = imageTypes.find(t => t.id === typeId);
                return type ? (
                  <span
                    key={typeId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                  >
                    {type.icon}
                    {type.description}
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

export default ImageTypeSelector;
