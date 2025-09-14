"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  File,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportDialogProps {
  data: any;
  filters: any;
  period: string;
  trigger?: React.ReactNode;
  onExport?: (format: string, options: any) => void;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  recommended?: boolean;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'excel',
    name: 'Excel',
    description: 'Подробный отчет с несколькими листами и форматированием',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    features: ['Несколько листов', 'Форматирование', 'Графики', 'Формулы'],
    recommended: true
  },
  {
    id: 'csv',
    name: 'CSV',
    description: 'Простой формат для импорта в другие системы',
    icon: <File className="h-5 w-5" />,
    features: ['Легкий импорт', 'Универсальность', 'Малый размер']
  },
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Готовый к печати отчет с графиками и форматированием',
    icon: <FileText className="h-5 w-5" />,
    features: ['Готов к печати', 'Графики', 'Профессиональный вид']
  }
];

export const ExportDialog: React.FC<ExportDialogProps> = ({
  data,
  filters,
  period,
  trigger,
  onExport
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('excel');
  const [exportOptions, setExportOptions] = useState({
    title: 'Аналитический отчет AutoRia',
    includeCharts: true,
    includeRawData: true,
    includeComparison: false,
    includeForecasts: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    if (!data) {
      toast.error('Нет данных для экспорта');
      return;
    }

    setIsExporting(true);
    setExportStatus('idle');

    try {
      const exportPayload = {
        format: selectedFormat,
        title: exportOptions.title,
        period,
        includeCharts: exportOptions.includeCharts,
        includeRawData: exportOptions.includeRawData,
        filters,
        data
      };

      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportPayload)
      });

      if (!response.ok) {
        throw new Error(`Ошибка экспорта: ${response.status}`);
      }

      // Получаем файл как blob
      const blob = await response.blob();
      
      // Определяем имя файла из заголовков или генерируем
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `analytics_report_${period}_${new Date().toISOString().split('T')[0]}.${selectedFormat === 'excel' ? 'xlsx' : selectedFormat}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Скачиваем файл
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus('success');
      toast.success(`Отчет успешно экспортирован в формате ${selectedFormat.toUpperCase()}`);
      
      // Вызываем callback если есть
      if (onExport) {
        onExport(selectedFormat, exportOptions);
      }

      // Закрываем диалог через 2 секунды
      setTimeout(() => {
        setIsOpen(false);
        setExportStatus('idle');
      }, 2000);

    } catch (error: any) {
      console.error('Export error:', error);
      setExportStatus('error');
      toast.error(error.message || 'Произошла ошибка при экспорте');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormatInfo = EXPORT_FORMATS.find(f => f.id === selectedFormat);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Экспорт аналитического отчета
          </DialogTitle>
          <DialogDescription>
            Выберите формат и настройки для экспорта данных аналитики
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Выбор формата */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Формат экспорта</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EXPORT_FORMATS.map((format) => (
                <Card 
                  key={format.id}
                  className={`cursor-pointer transition-all ${
                    selectedFormat === format.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {format.icon}
                        <CardTitle className="text-sm">{format.name}</CardTitle>
                      </div>
                      {format.recommended && (
                        <Badge variant="secondary" className="text-xs">
                          Рекомендуется
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-xs mb-2">
                      {format.description}
                    </CardDescription>
                    <div className="flex flex-wrap gap-1">
                      {format.features.slice(0, 2).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Настройки экспорта */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Настройки отчета</Label>
            
            {/* Название отчета */}
            <div className="space-y-2">
              <Label htmlFor="title">Название отчета</Label>
              <Input
                id="title"
                value={exportOptions.title}
                onChange={(e) => setExportOptions(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Введите название отчета"
              />
            </div>

            {/* Опции включения данных */}
            <div className="space-y-3">
              <Label>Включить в отчет</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRawData"
                    checked={exportOptions.includeRawData}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeRawData: !!checked }))
                    }
                  />
                  <Label htmlFor="includeRawData" className="text-sm">
                    Исходные данные временных рядов
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={exportOptions.includeCharts}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeCharts: !!checked }))
                    }
                    disabled={selectedFormat === 'csv'}
                  />
                  <Label htmlFor="includeCharts" className="text-sm">
                    Графики и диаграммы
                    {selectedFormat === 'csv' && (
                      <span className="text-muted-foreground ml-1">(недоступно для CSV)</span>
                    )}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeComparison"
                    checked={exportOptions.includeComparison}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeComparison: !!checked }))
                    }
                  />
                  <Label htmlFor="includeComparison" className="text-sm">
                    Сравнительная аналитика
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeForecasts"
                    checked={exportOptions.includeForecasts}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeForecasts: !!checked }))
                    }
                  />
                  <Label htmlFor="includeForecasts" className="text-sm">
                    Прогнозы и тренды
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Информация о выбранном формате */}
          {selectedFormatInfo && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {selectedFormatInfo.icon}
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{selectedFormatInfo.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedFormatInfo.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFormatInfo.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Статус экспорта */}
          {exportStatus !== 'idle' && (
            <Card className={exportStatus === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  {exportStatus === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium ${exportStatus === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {exportStatus === 'success' 
                      ? 'Отчет успешно экспортирован!' 
                      : 'Произошла ошибка при экспорте'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
            Отмена
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !data}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Экспортируем...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Экспортировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
