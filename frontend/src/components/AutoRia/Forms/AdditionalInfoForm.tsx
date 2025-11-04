"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Shield, 
  FileText, 
  Calendar,
  User,
  MapPin,
  Phone,
  Eye,
  EyeOff,
  Plus,
  X,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';

interface AdditionalInfoFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

const AdditionalInfoForm: React.FC<AdditionalInfoFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('settings');

  // Функция для обновления настроек видимости
  const updateVisibilitySettings = (field: string, value: boolean) => {
    onChange({
      ...data,
      visibility_settings: {
        ...data.visibility_settings,
        [field]: value
      }
    });
  };

  // Функция для обновления метаданных
  const updateMetadata = (field: string, value: any) => {
    onChange({
      ...data,
      metadata: {
        ...data.metadata,
        [field]: value
      }
    });
  };

  // Функция для добавления тега
  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    
    const currentTags = data.tags || [];
    if (!currentTags.includes(tag.trim())) {
      onChange({
        ...data,
        tags: [...currentTags, tag.trim()]
      });
    }
  };

  // Функция для удаления тега
  const removeTag = (tagToRemove: string) => {
    const currentTags = data.tags || [];
    onChange({
      ...data,
      tags: currentTags.filter(tag => tag !== tagToRemove)
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('autoria.additional.tabs.settings', 'Settings')}
          </TabsTrigger>
          <TabsTrigger value="metadata" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('autoria.additional.tabs.metadata', 'Metadata')}
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('autoria.additional.tabs.privacy', 'Privacy')}
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t('autoria.additional.settings.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Статус объявления */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  {t('autoria.additional.settings.status')}
                </label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={data.status === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange({ ...data, status: 'active' })}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t('autoria.additional.settings.active')}
                  </Button>
                  <Button
                    type="button"
                    variant={data.status === 'draft' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange({ ...data, status: 'draft' })}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {t('autoria.additional.settings.draft')}
                  </Button>
                  <Button
                    type="button"
                    variant={data.status === 'paused' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange({ ...data, status: 'paused' })}
                    className="flex items-center gap-2"
                  >
                    <EyeOff className="h-4 w-4" />
                    {t('autoria.additional.settings.paused')}
                  </Button>
                </div>
              </div>

              {/* Автопродление */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">{t('autoria.additional.settings.autoRenewal.title', 'Auto-renewal')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('autoria.additional.settings.autoRenewal.desc', 'Automatically extend the ad after expiration')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={data.auto_renewal ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange({ ...data, auto_renewal: !data.auto_renewal })}
                >
                  {data.auto_renewal ? t('autoria.additional.settings.autoRenewal.on', 'Enabled') : t('autoria.additional.settings.autoRenewal.off', 'Disabled')}
                </Button>
              </div>

              {/* Теги */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  {t('autoria.additional.settings.tags.label', 'Tags (for internal use)')}
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('autoria.additional.settings.tags.add', 'Add tag')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.querySelector(`input[placeholder="${t('autoria.additional.settings.tags.add')}"]`) as HTMLInputElement;
                        if (input) {
                          addTag(input.value);
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {data.tags && data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {data.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Дополнительные заметки */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('autoria.additional.settings.internalNotes')}
                </label>
                <textarea
                  value={data.internal_notes || ''}
                  onChange={(e) => onChange({ ...data, internal_notes: e.target.value })}
                  placeholder={t('autoria.additional.settings.internalNotesPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('autoria.additional.metadata.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SEO заголовок */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('autoria.additional.metadata.seoTitle')}
                </label>
                <input
                  type="text"
                  value={data.seo_title || ''}
                  onChange={(e) => updateMetadata('seo_title', e.target.value)}
                  placeholder={t('autoria.additional.metadata.seoTitlePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={60}
                />
                <p className="text-xs text-gray-500">
                  {t('autoria.additional.metadata.recommendedTitle', 'Recommended up to 60 characters')}: {data.seo_title?.length || 0}
                </p>
              </div>

              {/* SEO описание */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('autoria.additional.metadata.seoDescriptionLabel', 'SEO description')}
                </label>
                <textarea
                  value={data.seo_description || ''}
                  onChange={(e) => updateMetadata('seo_description', e.target.value)}
                  placeholder={t('autoria.additional.metadata.seoDescriptionPlaceholder', 'Description for search engines')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={160}
                />
                <p className="text-xs text-gray-500">
                  Рекомендовано до 160 символів. Поточна довжина: {data.seo_description?.length || 0}
                </p>
              </div>

              {/* Ключевые слова */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('autoria.additional.metadata.keywordsLabel', 'Keywords')}
                </label>
                <input
                  type="text"
                  value={data.keywords || ''}
                  onChange={(e) => updateMetadata('keywords', e.target.value)}
                  placeholder={t('autoria.additional.metadata.keywordsPlaceholder', 'Keywords separated by commas')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Дата публикации */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('autoria.additional.metadata.publishDateLabel', 'Publish date')}
                </label>
                <input
                  type="datetime-local"
                  value={data.publish_date || ''}
                  onChange={(e) => onChange({ ...data, publish_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  {t('autoria.additional.metadata.publishDateHint', 'Leave empty to publish immediately')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('autoria.additional.privacy.title', 'Privacy settings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Настройки видимости */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">{t('autoria.additional.privacy.showPublic')}</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{t('autoria.additional.privacy.phoneTitle')}</p>
                        <p className="text-xs text-gray-600">{t('autoria.additional.privacy.phoneDesc')}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={data.visibility_settings?.show_phone ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateVisibilitySettings('show_phone', !data.visibility_settings?.show_phone)}
                    >
                      {data.visibility_settings?.show_phone ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{t('autoria.additional.privacy.exactAddressTitle')}</p>
                        <p className="text-xs text-gray-600">{t('autoria.additional.privacy.exactAddressDesc')}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={data.visibility_settings?.show_exact_location ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateVisibilitySettings('show_exact_location', !data.visibility_settings?.show_exact_location)}
                    >
                      {data.visibility_settings?.show_exact_location ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{t('autoria.additional.privacy.ownerNameTitle')}</p>
                        <p className="text-xs text-gray-600">{t('autoria.additional.privacy.ownerNameDesc')}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={data.visibility_settings?.show_owner_name ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateVisibilitySettings('show_owner_name', !data.visibility_settings?.show_owner_name)}
                    >
                      {data.visibility_settings?.show_owner_name ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Предупреждение о приватности */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{t('autoria.additional.privacy.recommendationsTitle', 'Privacy recommendations')}:</p>
                    <ul className="text-sm space-y-1 ml-4 list-disc">
                      <li>{t('autoria.additional.privacy.rec1', 'Show phone number for quicker contact')}</li>
                      <li>{t('autoria.additional.privacy.rec2', 'Hide exact address for safety')}</li>
                      <li>{t('autoria.additional.privacy.rec3', 'Use a nickname instead of full name')}</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Показать ошибки если есть */}
      {errors && errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">{t('common.validation.error', 'Validation errors')}:</p>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AdditionalInfoForm;
