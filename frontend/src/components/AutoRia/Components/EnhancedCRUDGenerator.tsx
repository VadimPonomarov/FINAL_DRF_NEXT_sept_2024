"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Car, 
  Image as ImageIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Upload,
  Download,
  RefreshCw,
  Settings,
  User,
  Camera
} from 'lucide-react';

interface CarAd {
  id: number;
  title: string;
  description: string;
  mark: string;
  model: string;
  price: number;
  currency: string;
  images: Array<{
    id: number;
    image_url?: string;
    image?: string;
    is_primary: boolean;
  }>;
  dynamic_fields: {
    year: number;
    mileage: number;
    fuel_type: string;
    transmission: string;
    body_type: string;
    color: string;
    condition: string;
  };
}

interface CRUDOperation {
  type: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: Date;
  adId?: number;
}

const EnhancedCRUDGenerator: React.FC = () => {
  const { toast } = useToast();
  
  // Состояние аутентификации
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  // Состояние CRUD операций
  const [operations, setOperations] = useState<CRUDOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAd, setSelectedAd] = useState<CarAd | null>(null);
  const [userAds, setUserAds] = useState<CarAd[]>([]);
  
  // Состояние формы создания/редактирования
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mark: '',
    model: '',
    price: '',
    currency: 'USD',
    year: '',
    mileage: '',
    fuel_type: '',
    transmission: '',
    body_type: '',
    color: '',
    condition: ''
  });
  
  // Состояние работы с изображениями
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageTypes, setImageTypes] = useState<string[]>(['front', 'side']);
  const [generateImages, setGenerateImages] = useState(true);
  
  // Аутентификация пользователя через существующий API
  const authenticate = async () => {
    setIsLoading(true);
    try {
      // Используем существующий NextAuth или другой механизм аутентификации
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'pvs.versia@gmail.com',
          password: '12345678'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAuthToken(data.access);
        setIsAuthenticated(true);
        addOperation('READ', 'success', 'Аутентификация успешна');
        await loadUserAds();
      } else {
        throw new Error('Ошибка аутентификации');
      }
    } catch (error) {
      addOperation('READ', 'error', `Ошибка аутентификации: ${error}`);
      toast({
        title: "Ошибка аутентификации",
        description: "Не удалось войти в систему",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Добавление операции в лог
  const addOperation = (type: CRUDOperation['type'], status: CRUDOperation['status'], message: string, adId?: number) => {
    const operation: CRUDOperation = {
      type,
      status,
      message,
      timestamp: new Date(),
      adId
    };
    setOperations(prev => [operation, ...prev.slice(0, 19)]); // Храним последние 20 операций
  };
  
  // Получение заголовков авторизации
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  });
  
  // Загрузка объявлений пользователя
  const loadUserAds = async () => {
    if (!authToken) return;

    try {
      const response = await fetch('http://localhost:8000/api/ads/cars/', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const ads = data.results || data;
        setUserAds(ads);
        addOperation('READ', 'success', `Загружено ${ads.length} объявлений`);
      }
    } catch (error) {
      addOperation('READ', 'error', `Ошибка загрузки объявлений: ${error}`);
    }
  };
  
  // Генерация mock данных для формы
  const generateMockData = () => {
    const mockData = {
      title: `Mercedes-Benz E200 ${new Date().getFullYear()} - отличное состояние`,
      description: 'Автомобиль в идеальном состоянии. Один владелец, полная сервисная история. Все ТО пройдены вовремя.',
      mark: '3781', // Mercedes-Benz ID
      model: 'E200',
      price: '35000',
      currency: 'USD',
      year: '2019',
      mileage: '45000',
      fuel_type: 'petrol',
      transmission: 'automatic',
      body_type: 'sedan',
      color: 'black',
      condition: 'excellent'
    };
    
    setFormData(mockData);
    toast({
      title: "Mock данные сгенерированы",
      description: "Форма заполнена тестовыми данными"
    });
  };
  
  // Создание объявления
  const createAd = async () => {
    if (!authToken) return;
    
    setIsLoading(true);
    addOperation('CREATE', 'pending', 'Создание объявления...');
    
    try {
      const adData = {
        title: formData.title,
        description: formData.description,
        mark: parseInt(formData.mark),
        model: formData.model,
        price: parseFloat(formData.price),
        currency: formData.currency,
        region: 203, // Київська область
        city: 1142,  // Київ
        seller_type: 'private',
        exchange_status: 'possible',
        dynamic_fields: {
          year: parseInt(formData.year),
          mileage: parseInt(formData.mileage),
          fuel_type: formData.fuel_type,
          transmission: formData.transmission,
          body_type: formData.body_type,
          color: formData.color,
          condition: formData.condition,
          engine_volume: 2.0,
          engine_power: 245
        }
      };
      
      const response = await fetch('http://localhost:8000/api/ads/cars/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(adData)
      });
      
      if (response.ok) {
        const createdAd = await response.json();
        addOperation('CREATE', 'success', `Объявление создано с ID: ${createdAd.id}`, createdAd.id);
        
        // Генерируем изображения если нужно
        if (generateImages) {
          await generateImagesForAd(createdAd.id);
        }
        
        // Загружаем файлы если есть
        if (selectedImages.length > 0) {
          await uploadImagesForAd(createdAd.id);
        }
        
        await loadUserAds();
        
        toast({
          title: "Объявление создано",
          description: `Успешно создано объявление ID: ${createdAd.id}`
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка создания');
      }
    } catch (error) {
      addOperation('CREATE', 'error', `Ошибка создания: ${error}`);
      toast({
        title: "Ошибка создания",
        description: `${error}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Генерация изображений для объявления (с нормализацией параметров)
  const generateImagesForAd = async (adId: number) => {
    // Helpers
    const normalizeVehicleType = (raw?: any, rawName?: any): string => {
      const s = String(raw ?? '').toLowerCase().trim();
      const name = String(rawName ?? '').toLowerCase().trim();
      const byId: Record<string, string> = { '1': 'car', '2': 'truck', '3': 'motorcycle', '4': 'bus', '5': 'van', '6': 'trailer' };
      if (byId[s]) return byId[s];
      const map: Record<string, string> = {
        'легковой': 'car', 'легковий': 'car', 'легковые автомобили': 'car', 'легкові автомобілі': 'car', 'автомобиль': 'car', 'auto': 'car', 'car': 'car',
        'грузовой': 'truck', 'грузовик': 'truck', 'вантажівка': 'truck', 'грузовые автомобили': 'truck', 'вантажні автомобілі': 'truck', 'truck': 'truck',
        'мотоцикл': 'motorcycle', 'мотоцикли': 'motorcycle', 'скутер': 'motorcycle', 'motorcycle': 'motorcycle',
        'автобус': 'bus', 'автобуси': 'bus', 'bus': 'bus',
        'фургон': 'van', 'мінівен': 'van', 'минивэн': 'van', 'van': 'van', 'minivan': 'van',
        'прицеп': 'trailer', 'полуприцеп': 'trailer', 'trailer': 'trailer'
      };
      if (map[s]) return map[s];
      if (map[name]) return map[name];
      return 'car';
    };
    const mapCondition = (c?: string): 'excellent' | 'good' | 'fair' | 'poor' => {
      const n = String(c || '').toLowerCase();
      if (['new', 'excellent', 'новый', 'нове'].includes(n)) return 'excellent';
      if (['poor', 'damaged', 'битый', 'пошкоджений'].includes(n)) return 'poor';
      if (['fair', 'среднее', 'середнє'].includes(n)) return 'fair';
      return 'good';
    };
    const pickBodyByType = (vt: string, current?: string): string => {
      if (current) return current;
      switch (vt) {
        case 'truck': return 'semi-truck';
        case 'motorcycle': return 'sport';
        case 'bus': return 'coach';
        case 'van': return 'van';
        case 'trailer': return 'curtainsider';
        default: return 'sedan';
      }
    };

    try {
      const vt = normalizeVehicleType((formData as any).vehicle_type, (formData as any).vehicle_type_name);
      const brandStr = ((): string => {
        if (typeof (formData as any).brand === 'string' && isNaN(Number((formData as any).brand))) return (formData as any).brand as string;
        if ((formData as any).brand_name) return (formData as any).brand_name as string;
        if ((formData as any).mark_name) return (formData as any).mark_name as string;
        return 'BMW';
      })();
      const modelStr = formData.model || 'Unknown';
      const yearNum = parseInt(formData.year) || 2020;
      const colorStr = formData.color || 'black';
      const bodyTypeStr = pickBodyByType(vt, formData.body_type);
      const condStr = mapCondition(formData.condition);

      const response = await fetch('http://localhost:8000/api/chat/generate-car-images/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          car_data: {
            brand: brandStr,
            model: modelStr,
            year: yearNum,
            color: colorStr,
            body_type: bodyTypeStr,
            vehicle_type: vt,
            vehicle_type_name: (formData as any).vehicle_type_name || vt,
            condition: condStr,
            description: formData.description || ''
          },
          angles: imageTypes,
          style: 'realistic'
        })
      });

      if (response.ok) {
        const imagesData = await response.json();
        addOperation('CREATE', 'success', `Сгенерировано ${imagesData.images?.length || 0} изображений для объявления ${adId}`, adId);
      }
    } catch (error) {
      addOperation('CREATE', 'error', `Ошибка генерации изображений: ${error}`, adId);
    }
  };
  
  // Загрузка изображений из файловой системы
  const uploadImagesForAd = async (adId: number) => {
    for (const file of selectedImages) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`http://localhost:8000/api/ads/${adId}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData
        });
        
        if (response.ok) {
          addOperation('CREATE', 'success', `Загружено изображение: ${file.name}`, adId);
        }
      } catch (error) {
        addOperation('CREATE', 'error', `Ошибка загрузки ${file.name}: ${error}`, adId);
      }
    }
  };
  
  // Обновление объявления
  const updateAd = async (adId: number) => {
    if (!authToken) return;
    
    setIsLoading(true);
    addOperation('UPDATE', 'pending', `Обновление объявления ${adId}...`);
    
    try {
      const updateData = {
        title: `[UPDATED] ${formData.title}`,
        price: parseFloat(formData.price) + 1000,
        description: `${formData.description} [Обновлено: ${new Date().toLocaleString()}]`
      };
      
      const response = await fetch(`http://localhost:8000/api/ads/cars/${adId}/update`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        addOperation('UPDATE', 'success', `Объявление ${adId} обновлено`);
        await loadUserAds();
        
        toast({
          title: "Объявление обновлено",
          description: `Успешно обновлено объявление ID: ${adId}`
        });
      } else {
        throw new Error('Ошибка обновления');
      }
    } catch (error) {
      addOperation('UPDATE', 'error', `Ошибка обновления ${adId}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Удаление объявления
  const deleteAd = async (adId: number) => {
    if (!authToken) return;
    
    setIsLoading(true);
    addOperation('DELETE', 'pending', `Удаление объявления ${adId}...`);
    
    try {
      const response = await fetch(`http://localhost:8000/api/ads/cars/${adId}/delete`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        addOperation('DELETE', 'success', `Объявление ${adId} удалено`);
        await loadUserAds();
        
        toast({
          title: "Объявление удалено",
          description: `Успешно удалено объявление ID: ${adId}`
        });
      } else {
        throw new Error('Ошибка удаления');
      }
    } catch (error) {
      addOperation('DELETE', 'error', `Ошибка удаления ${adId}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Удаление изображения
  const deleteImage = async (adId: number, imageId: number) => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/ads/${adId}/images/${imageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        addOperation('DELETE', 'success', `Изображение ${imageId} удалено из объявления ${adId}`);
        await loadUserAds();
      }
    } catch (error) {
      addOperation('DELETE', 'error', `Ошибка удаления изображения: ${error}`);
    }
  };
  
  useEffect(() => {
    // Автоматическая аутентификация при загрузке компонента
    authenticate();
  }, []);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Расширенный CRUD генератор для pvs.versia@gmail.com
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={isAuthenticated ? "default" : "destructive"}>
              {isAuthenticated ? "Аутентифицирован" : "Не аутентифицирован"}
            </Badge>
            <Badge variant="outline">
              Объявлений: {userAds.length}
            </Badge>
            <Button 
              onClick={authenticate} 
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Форма создания/редактирования */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Создание объявления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Заголовок</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Название автомобиля"
              />
            </div>
            <div>
              <Label htmlFor="model">Модель</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="E200"
              />
            </div>
            <div>
              <Label htmlFor="price">Цена</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="35000"
              />
            </div>
            <div>
              <Label htmlFor="year">Год</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                placeholder="2019"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Подробное описание автомобиля"
              rows={3}
            />
          </div>
          
          {/* Настройки изображений */}
          <div className="space-y-3">
            <Label>Настройки изображений</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generateImages"
                checked={generateImages}
                onCheckedChange={setGenerateImages}
              />
              <Label htmlFor="generateImages">Генерировать изображения AI</Label>
            </div>
            
            {generateImages && (
              <div className="flex flex-wrap gap-2">
                {['front', 'side', 'rear', 'interior'].map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={imageTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setImageTypes(prev => [...prev, type]);
                        } else {
                          setImageTypes(prev => prev.filter(t => t !== type));
                        }
                      }}
                    />
                    <Label htmlFor={type}>{type}</Label>
                  </div>
                ))}
              </div>
            )}
            
            <div>
              <Label htmlFor="images">Загрузить изображения</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setSelectedImages(Array.from(e.target.files || []))}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={generateMockData} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Mock данные
            </Button>
            <Button onClick={createAd} disabled={isLoading || !isAuthenticated}>
              <Plus className="h-4 w-4 mr-2" />
              Создать объявление
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Список объявлений пользователя */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Мои объявления ({userAds.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userAds.map(ad => (
              <div key={ad.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{ad.title}</h3>
                    <p className="text-sm text-gray-600">{ad.description.substring(0, 100)}...</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{ad.price} {ad.currency}</Badge>
                      <Badge variant="outline">{ad.images.length} фото</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateAd(ad.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteAd(ad.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Изображения */}
                {ad.images.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {ad.images.map(img => (
                        <div key={img.id} className="relative">
                          <Badge variant="outline" className="text-xs">
                            ID: {img.id} {img.is_primary && '(Primary)'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="ml-2"
                            onClick={() => deleteImage(ad.id, img.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Лог операций */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Лог CRUD операций
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {operations.map((op, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Badge variant={
                  op.status === 'success' ? 'default' : 
                  op.status === 'error' ? 'destructive' : 'secondary'
                }>
                  {op.type}
                </Badge>
                <span className="text-gray-500">
                  {op.timestamp.toLocaleTimeString()}
                </span>
                <span>{op.message}</span>
                {op.adId && (
                  <Badge variant="outline">ID: {op.adId}</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedCRUDGenerator;
