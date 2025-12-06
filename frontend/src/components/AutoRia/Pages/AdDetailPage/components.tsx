"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Car, Phone, Mail, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getStatusConfig, getStatusLabel } from './utils';

interface LoadingStateProps {}

export const LoadingState: React.FC<LoadingStateProps> = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-200 border-t-blue-600 mx-auto mb-8"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Car className="h-12 w-12 text-blue-600 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Загружаем объявление</h2>
        <p className="text-slate-600">Пожалуйста, подождите...</p>

        {/* Loading skeleton */}
        <div className="mt-12 max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="loading-shimmer h-64 rounded-3xl"></div>
              <div className="loading-shimmer h-32 rounded-3xl"></div>
            </div>
            <div className="space-y-6">
              <div className="loading-shimmer h-48 rounded-3xl"></div>
              <div className="loading-shimmer h-32 rounded-3xl"></div>
              <div className="loading-shimmer h-40 rounded-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ErrorStateProps {
  loadError?: string;
  onReload: () => void;
  onBack: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ loadError, onReload, onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Ошибка загрузки
          </h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            {loadError || 'Объявление не найдено. Возможно, оно было удалено или перемещено.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onReload}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover-lift smooth-transition"
            >
              Попробовать снова
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="border-2 border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-3 rounded-xl font-semibold"
            >
              <AlertCircle className="h-5 w-5 mr-2" />
              Назад
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdDetailContentProps {
  adData: any;
  currentImageIndex: number;
  setCurrentImageIndex: (index: number) => void;
  nextImage: () => void;
  prevImage: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  isAuthenticated: boolean;
  showPhoneList: boolean;
  phoneListRef: React.RefObject<HTMLDivElement>;
  handlePhoneButtonClick: () => void;
  tReact: (key: string, defaultValue?: string) => string;
  t: (key: string, defaultValue?: string) => string;
  toast: any;
  router: any;
}

export const AdDetailContent: React.FC<AdDetailContentProps> = ({
  adData,
  currentImageIndex,
  setCurrentImageIndex,
  nextImage,
  prevImage,
  formatCurrency,
  isAuthenticated,
  showPhoneList,
  phoneListRef,
  handlePhoneButtonClick,
  tReact,
  t,
  toast,
  router,
}) => {
  const getStatusBadgeComponent = (status: string) => {
    const config = getStatusConfig(status);
    const label = getStatusLabel(status, t);
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Images and Description */}
      <div className="lg:col-span-2 space-y-6">
        {/* Price Block */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {adData.price_usd ? formatCurrency(adData.price_usd, 'USD') : formatCurrency(adData.price, adData.currency)}
          </div>

          {/* Additional currency prices */}
          <div className="space-y-1 text-sm text-gray-600">
            {adData.price_eur && (
              <div>≈ {formatCurrency(adData.price_eur, 'EUR')}</div>
            )}
            <div>≈ {formatCurrency(adData.price, 'UAH')}</div>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Курсы валют могут изменяться
          </div>
        </div>

        {/* Image Gallery */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="relative">
            <div className="relative aspect-video bg-gray-100">
              {adData.images && adData.images.length > 0 ? (
                (() => {
                  const currentImage = adData.images[currentImageIndex];
                  const imageUrl = currentImage?.image_display_url || currentImage?.image_url || currentImage?.url || currentImage?.image;
                  console.log('[AdDetailPage] Rendering image:', { currentImageIndex, currentImage, imageUrl });
                  return (
                    <img
                      src={imageUrl}
                      alt={adData.title}
                      className="w-full h-full object-cover"
                      onLoad={() => console.log('[AdDetailPage] Image loaded successfully:', imageUrl)}
                      onError={(e) => {
                        console.error('[AdDetailPage] Image failed to load:', imageUrl);
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/placeholder/800/400?text=Car+Image';
                      }}
                    />
                  );
                })()
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Нет изображений</p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {adData.images && adData.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  {/* Image Counter */}
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
                    {currentImageIndex + 1} / {adData.images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {adData.images && adData.images.length > 1 && (
              <div className="p-4 bg-gray-50">
                <div className="flex gap-2 overflow-x-auto">
                  {adData.images.map((image: any, index: number) => (
                    <button
                      key={image.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-12 rounded border-2 overflow-hidden transition-all ${
                        index === currentImageIndex
                          ? 'border-orange-500 ring-2 ring-orange-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image.image_display_url || image.image}
                        alt={`${adData.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/api/placeholder/100/80?text=Car';
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {adData.description && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {tReact('adView.description')}
            </h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {adData.description}
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Sidebar */}
      <div className="space-y-6">
        {/* Characteristics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {tReact('adView.characteristics')}
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">{tReact('adView.type')}:</span>
              <span className="font-medium text-orange-600">{adData.vehicle_type_name || 'Не указано'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">{tReact('adView.brand')}:</span>
              <span className="font-medium text-orange-600">{adData.mark_name || 'Не указано'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">{tReact('adView.model')}:</span>
              <span className="font-medium text-orange-600">{adData.model || 'Не указано'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">{tReact('adView.year')}:</span>
              <span className="font-medium text-orange-600">{adData.year || 'Не указано'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">{tReact('adView.mileage')}:</span>
              <span className="font-medium text-orange-600">
                {adData.mileage ? `${adData.mileage.toLocaleString()} км` : 'Не указано'}
              </span>
            </div>

            {/* Additional specs if available */}
            {adData.car_specs?.fuel_type && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">{tReact('adView.fuelType')}:</span>
                <span className="font-medium text-orange-600">{adData.car_specs.fuel_type}</span>
              </div>
            )}
            {adData.car_specs?.transmission && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">{tReact('adView.transmission')}:</span>
                <span className="font-medium text-orange-600">{adData.car_specs.transmission}</span>
              </div>
            )}
            {adData.car_specs?.engine_volume && (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Объем двигателя:</span>
                <span className="font-medium text-orange-600">{adData.car_specs.engine_volume}л</span>
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {tReact('adView.location')}
          </h3>

          <div className="space-y-2">
            <div className="font-medium text-gray-900">{adData.city_name}</div>
            <div className="text-gray-600">{adData.region_name}</div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {tReact('adView.contactInfo')}
          </h3>

          <div className="space-y-4">
            {/* Show ad contacts if they are available */}
            {adData.contacts && adData.contacts.length > 0 ? (
              <div className="space-y-3">
                {adData.contacts
                  .filter((contact: any) => contact.is_visible)
                  .map((contact: any, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      {contact.type === 'phone' && <Phone className="h-4 w-4 text-gray-500" />}
                      {contact.type === 'email' && <Mail className="h-4 w-4 text-gray-500" />}
                      {contact.type === 'telegram' && <span className="text-sm">📲</span>}
                      {contact.type === 'viber' && <span className="text-sm">📡</span>}
                      {contact.type === 'whatsapp' && <span className="text-sm">💬</span>}
                      <div className="flex-1">
                        <span className="text-sm text-gray-700">{contact.value}</span>
                        {contact.note && (
                          <div className="text-xs text-gray-500">{contact.note}</div>
                        )}
                        {contact.is_primary && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                            {tReact('contacts.primary', 'Primary')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{adData.user.email}</span>
              </div>
            )}

            <div className="space-y-2 pt-4">
              {isAuthenticated ? (
                <>
                  <Button
                    data-phone-button
                    type="button"
                    onClick={handlePhoneButtonClick}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {tReact('adView.showPhone')}
                  </Button>

                  {showPhoneList && (
                    <div ref={phoneListRef} className="mt-2 w-full rounded-md border bg-white shadow-sm">
                      {(() => {
                        const list = adData.contacts?.filter((c: any) => String(c.type).toLowerCase() === 'phone') || [];
                        if (list.length === 0) {
                          return (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {tReact('adView.noPhones', 'Продавець не вказав номер телефону.')}<br />
                              <span className="text-xs text-gray-400">
                                {tReact('adView.contactByEmail', 'Ви можете написати продавцю на email:')} {adData.user?.email}
                              </span>
                            </div>
                          );
                        }
                        return list.map((c: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <a href={`tel:${c.value}`} className="text-sm text-blue-600 hover:underline">{c.value}</a>
                            </div>
                            <div className="flex items-center gap-2">
                              {c.is_primary && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{tReact('contacts.primary', 'Primary')}</span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await navigator.clipboard.writeText(c.value);
                                    toast({ title: tReact('common.copied', 'Скопійовано'), description: c.value, duration: 1500 });
                                  } catch {
                                    toast({ title: tReact('common.copyFailed', 'Не вдалося скопіювати'), description: c.value, duration: 2000, variant: 'destructive' });
                                  }
                                }}
                                className="text-slate-500 hover:text-slate-700"
                                aria-label={tReact('common.copy', 'Скопіювати')}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
                    onClick={() => {
                      const emailContacts = adData.contacts?.filter((c: any) => c.type === 'email' && c.is_visible) || [];
                      const emailAddresses = emailContacts.length > 0
                        ? emailContacts.map((c: any) => c.value).join(',')
                        : adData.user.email;
                      window.open(`mailto:${emailAddresses}`, '_self');
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {tReact('adView.sendEmail')}
                  </Button>
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Требуется авторизация</span>
                  </div>
                  <p className="text-xs text-yellow-700 mb-3">
                    Войдите в систему, чтобы увидеть контактную информацию
                  </p>
                  <Button
                    onClick={() => router.push('/auth/login')}
                    size="sm"
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Войти в систему
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
