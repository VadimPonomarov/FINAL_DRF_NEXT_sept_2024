"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  Share2, 
  Phone, 
  MessageCircle, 
  Eye, 
  Calendar,
  Gauge,
  Fuel,
  Settings,
  MapPin,
  User,
  Star,
  ArrowLeft,
  Flag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { CarAd } from '@/types/autoria';
import CarAdsService from '@/services/autoria/carAds.service';
import { FavoritesService } from '@/services/autoria/favorites.service';
import { useI18n } from '@/contexts/I18nContext';

interface AdDetailPageProps {
  adId: number;
}

const AdDetailPage: React.FC<AdDetailPageProps> = ({ adId }) => {
  const { t } = useI18n();
  const [ad, setAd] = useState<CarAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const loadAd = async () => {
      try {
        // Моковые данные для демонстрации
        const mockAd: CarAd = {
          id: adId,
          title: "BMW X5 2020 року в відмінному стані",
          description: `Продається чудовий BMW X5 2020 року випуску в ідеальному стані. 

Автомобіль має повну історію обслуговування в офіційному дилері BMW. Один власник з моменту покупки. 

Технічні характеристики:
- Двигун: 3.0L турбо
- Потужність: 340 к.с.
- Привід: повний xDrive
- Коробка: автоматична 8-ступінчаста

Комплектація:
- Шкіряний салон
- Панорамний дах
- Система навігації
- Камера заднього виду
- Парктронік
- Клімат-контроль
- Підігрів сидінь

Автомобіль знаходиться в ідеальному технічному стані, без ДТП та фарбування. Всі ТО пройдені вчасно.

Причина продажу - переїзд за кордон.`,
          brand: "BMW",
          model: "X5",
          year: 2020,
          mileage: 35000,
          price: 45000,
          currency: "USD",
          region: "Київська область",
          city: "Київ",
          status: "active",
          created_at: "2024-01-15T10:30:00Z",
          updated_at: "2024-01-15T10:30:00Z",
          images: [
            {
              id: 1,
              image: "/api/placeholder/800/600",
              is_main: true,
              order: 0,
              created_at: "2024-01-15T10:30:00Z"
            },
            {
              id: 2,
              image: "/api/placeholder/800/600",
              is_main: false,
              order: 1,
              created_at: "2024-01-15T10:30:00Z"
            },
            {
              id: 3,
              image: "/api/placeholder/800/600",
              is_main: false,
              order: 2,
              created_at: "2024-01-15T10:30:00Z"
            }
          ],
          user: {
            id: 1,
            email: "seller@example.com",
            account_type: "premium"
          },
          view_count: 245,
          is_favorite: false
        };

        setAd(mockAd);

        // Загружаем реальный статус избранного из API
        try {
          const favoriteResponse = await fetch(`/api/autoria/favorites/check/${adId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (favoriteResponse.ok) {
            const favoriteData = await favoriteResponse.json();
            setIsFavorite(favoriteData.is_favorite || false);
            console.log('[AdDetailPage] Loaded favorite status:', favoriteData.is_favorite);
          } else {
            // Если ошибка при загрузке статуса избранного, используем значение по умолчанию
            setIsFavorite(mockAd.is_favorite || false);
          }
        } catch (favoriteError) {
          console.error('[AdDetailPage] Error loading favorite status:', favoriteError);
          setIsFavorite(mockAd.is_favorite || false);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to load ad:', error);
        setLoading(false);
      }
    };

    loadAd();
  }, [adId]);

  const toggleFavorite = async () => {
    try {
      // Оптимистично обновляем UI
      const oldFavoriteStatus = isFavorite;
      setIsFavorite(!oldFavoriteStatus);

      // Отправляем запрос на backend
      const response = await FavoritesService.toggleFavorite(adId);

      console.log('[AdDetailPage] Favorite toggled:', {
        adId,
        is_favorite: response.is_favorite,
        message: response.message
      });

      // Показываем алерт об успешном действии
      alert(response.message || (response.is_favorite ? 'Добавлено в избранное' : 'Удалено из избранного'));

      // Обновляем UI с реальным статусом от сервера
      setIsFavorite(response.is_favorite);

    } catch (error) {
      console.error('[AdDetailPage] Failed to toggle favorite:', error);

      // В случае ошибки возвращаем предыдущее состояние
      setIsFavorite(!isFavorite);

      // Показываем алерт об ошибке
      alert('Ошибка при изменении статуса избранного. Попробуйте еще раз.');
    }
  };

  const shareAd = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: ad?.title,
          text: `${t('autoria.shareAdText')} ${ad?.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback - копирование в буфер обмена
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const symbols = { USD: '$', EUR: '€', UAH: '₴' };
    return `${symbols[currency as keyof typeof symbols] || ''}${price.toLocaleString()}`;
  };

  const nextImage = () => {
    if (ad?.images && ad.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % ad.images.length);
    }
  };

  const prevImage = () => {
    if (ad?.images && ad.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + ad.images.length) % ad.images.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">{t('loadingAd')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {t('autoria.adNotFound')}
                </h3>
                <p className="text-slate-600 mb-6">
                  {t('autoria.adNotFoundDesc')}
                </p>
                <Link href="/autoria/search">
                  <Button>
                    {t('autoria.backToSearch')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-slate-600">
          <Link href="/autoria" className="hover:text-slate-900">AutoRia</Link>
          <span>/</span>
          <Link href="/autoria/search" className="hover:text-slate-900">{t('autoria.search')}</Link>
          <span>/</span>
          <span className="text-slate-900">{ad.brand} {ad.model}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  {ad.images.length > 0 ? (
                    <>
                      <img
                        src={ad.images[currentImageIndex]?.image}
                        alt={ad.title}
                        className="w-full h-96 object-cover rounded-t-lg"
                      />
                      {ad.images.length > 1 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                            onClick={prevImage}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                            onClick={nextImage}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            {currentImageIndex + 1} / {ad.images.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-96 bg-slate-200 rounded-t-lg flex items-center justify-center">
                      <span className="text-slate-400">Нет изображений</span>
                    </div>
                  )}
                </div>
                
                {/* Thumbnail Navigation */}
                {ad.images.length > 1 && (
                  <div className="p-4">
                    <div className="flex gap-2 overflow-x-auto">
                      {ad.images.map((image, index) => (
                        <button
                          key={image.id}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-20 h-16 rounded border-2 overflow-hidden ${
                            index === currentImageIndex ? 'border-blue-500' : 'border-slate-200'
                          }`}
                        >
                          <img
                            src={image.image}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>{t('autoria.description')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-slate-700">
                  {ad.description}
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>{t('autoria.specifications')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-sm text-slate-500">{t('autoria.yearOfManufacture')}</div>
                      <div className="font-medium">{ad.year}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-sm text-slate-500">{t('autoria.mileage')}</div>
                      <div className="font-medium">{ad.mileage.toLocaleString()} {t('autoria.km')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="text-sm text-slate-500">{t('autoria.location')}</div>
                      <div className="font-medium">{ad.city}, {ad.region}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price and Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {formatPrice(ad.price, ad.currency)}
                  </div>
                  <div className="text-sm text-slate-600">
                    {ad.brand} {ad.model} • {ad.year}
                  </div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full" size="lg">
                    <Phone className="h-4 w-4 mr-2" />
                    {t('autoria.showPhone')}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t('autoria.sendMessage')}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={toggleFavorite}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                      {isFavorite ? t('autoria.inFavorites') : t('autoria.addToFavorites')}
                    </Button>
                    <Button variant="outline" onClick={shareAd}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline">
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('autoria.seller')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium">{t('autoria.privatePerson')}</div>
                    <div className="text-sm text-slate-600">{t('autoria.onSiteSince')} 2023 {t('autoria.year')}</div>
                  </div>
                  {ad.user.account_type === 'premium' && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin className="h-3 w-3" />
                    {ad.city}, {ad.region}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>{t('autoria.statistics')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">{t('autoria.views')}</span>
                    <span className="font-medium">{ad.view_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">{t('autoria.published')}</span>
                    <span className="font-medium">
                      {new Date(ad.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">{t('autoria.updated')}</span>
                    <span className="font-medium">
                      {new Date(ad.updated_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdDetailPage;
