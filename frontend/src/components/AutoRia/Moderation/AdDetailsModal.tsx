"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  MapPin,
  Car,
  User,
  Clock,
  DollarSign,
  Mail,
  Phone,
  Image as ImageIcon,
  Save,
  Edit3
} from 'lucide-react';
import { CarAd } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';

interface AdDetailsModalProps {
  ad: CarAd | null;
  isOpen: boolean;
  onClose: () => void;
  formatPrice: (price: number, currency: string, targetCurrency?: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  onSaveNotes?: (adId: number, notes: string) => Promise<void>;
}

const AdDetailsModal: React.FC<AdDetailsModalProps> = ({
  ad,
  isOpen,
  onClose,
  formatPrice,
  getStatusBadge,
  onSaveNotes
}) => {
  const { t } = useI18n();
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Инициализируем заметки при открытии модального окна
  React.useEffect(() => {
    if (ad && isOpen) {
      setNotes(ad.moderation_reason || '');
      setIsEditingNotes(false);
    }
  }, [ad, isOpen]);

  const handleSaveNotes = async () => {
    if (!ad || !onSaveNotes) return;
    
    setIsSavingNotes(true);
    try {
      await onSaveNotes(ad.id, notes);
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCancelEdit = () => {
    setNotes(ad?.moderation_reason || '');
    setIsEditingNotes(false);
  };

  if (!ad) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {ad.title}
          </DialogTitle>
          <DialogDescription>
            {t('autoria.moderation.adDetails')} #{ad.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('autoria.moderation.basicInfo')}</span>
                {getStatusBadge(ad.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{t('autoria.moderation.brand')}:</span>
                    <span>{ad.brand} {ad.model}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{t('autoria.moderation.year')}:</span>
                    <span>{ad.year}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{t('autoria.moderation.location')}:</span>
                    <span>{ad.city}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{t('autoria.moderation.price')}:</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatPrice(ad.price, ad.currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{t('autoria.moderation.created')}:</span>
                    <span>{new Date(ad.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Описание */}
          <Card>
            <CardHeader>
              <CardTitle>{t('autoria.moderation.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{ad.description}</p>
            </CardContent>
          </Card>

          {/* Контактная информация */}
          <Card>
            <CardHeader>
              <CardTitle>{t('autoria.moderation.contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{t('autoria.moderation.user')}:</span>
                <span>{ad.user?.email || '—'}</span>
              </div>
              {ad.user?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{t('autoria.moderation.phone')}:</span>
                  <span>{ad.user.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Технические характеристики */}
          {(ad.mileage || ad.fuel_type || ad.transmission || ad.body_type) && (
            <Card>
              <CardHeader>
                <CardTitle>{t('autoria.moderation.technicalSpecs')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ad.mileage && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t('autoria.moderation.mileage')}:</span>
                      <span>{ad.mileage.toLocaleString()} км</span>
                    </div>
                  )}
                  {ad.fuel_type && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t('autoria.moderation.fuelType')}:</span>
                      <span>{ad.fuel_type}</span>
                    </div>
                  )}
                  {ad.transmission && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t('autoria.moderation.transmission')}:</span>
                      <span>{ad.transmission}</span>
                    </div>
                  )}
                  {ad.body_type && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t('autoria.moderation.bodyType')}:</span>
                      <span>{ad.body_type}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Изображения */}
          {ad.images && ad.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {t('autoria.moderation.images')} ({ad.images.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ad.images.map((image, index) => {
                    // Определяем URL изображения из различных возможных полей
                    const imageUrl = image.image_url || image.image_display_url || image.url || image.image;
                    
                    // Если это строка, используем её как URL
                    const finalUrl = typeof imageUrl === 'string' 
                      ? (imageUrl.startsWith('http') ? imageUrl : `/api/media/${imageUrl.replace(/^\/+/, '')}`)
                      : '/placeholder-car.jpg';
                    
                    return (
                      <div key={image.id || index} className="relative">
                        <img
                          src={finalUrl}
                          alt={`${ad.title} - ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== '/placeholder-car.jpg') {
                              target.src = '/placeholder-car.jpg';
                            }
                          }}
                        />
                        {image.is_main && (
                          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            {t('autoria.mainImage')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Сообщение если нет изображений */}
          {(!ad.images || ad.images.length === 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {t('autoria.moderation.images')} (0)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('autoria.noImages')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Модерационные заметки */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  {t('autoria.moderation.moderationNotes')}
                </div>
                {!isEditingNotes && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingNotes(true)}
                    className="h-8 px-3 text-xs"
                  >
                    {notes ? t('autoria.moderation.editNotes') : t('autoria.moderation.addNotes')}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <div className="space-y-4">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('autoria.moderation.notesPlaceholder')}
                    className="min-h-[100px] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="h-8 px-3 text-xs"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {isSavingNotes ? t('common.saving') : t('autoria.moderation.saveNotes')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSavingNotes}
                      className="h-8 px-3 text-xs"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
                  ) : (
                    <p className="text-gray-500 italic">{t('autoria.moderation.notesPlaceholder')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdDetailsModal;
