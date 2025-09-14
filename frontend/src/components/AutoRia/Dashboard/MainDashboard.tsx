"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  ShoppingCart, 
  Car, 
  Shield, 
  Crown,
  Settings,
  BarChart3,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Database
} from 'lucide-react';
import DashboardStatsWidget from '@/components/AutoRia/Statistics/DashboardStatsWidget';

// 🎭 Типы ролей пользователей
type UserRole = 'buyer' | 'seller' | 'manager' | 'admin';

// 📊 Интерфейс для статистики
interface DashboardStats {
  totalAds: number;
  activeAds: number;
  pendingAds: number;
  rejectedAds: number;
  totalViews: number;
  todayViews: number;
  averagePrice: number;
  totalUsers: number;
}

// 🎨 Конфигурация ролей с эмодзи
const ROLE_CONFIG = {
  buyer: {
    label: '🛒 Покупатель',
    icon: ShoppingCart,
    color: 'bg-blue-500',
    description: 'Поиск и покупка автомобилей'
  },
  seller: {
    label: '🚗 Продавец',
    icon: Car,
    color: 'bg-green-500',
    description: 'Продажа автомобилей'
  },
  manager: {
    label: '🛡️ Менеджер',
    icon: Shield,
    color: 'bg-orange-500',
    description: 'Модерация и управление платформой'
  },
  admin: {
    label: '👑 Администратор',
    icon: Crown,
    color: 'bg-purple-500',
    description: 'Полное управление системой'
  }
};

// 💎 Типы аккаунтов
const ACCOUNT_TYPES = {
  basic: {
    label: '🆓 Базовый',
    color: 'bg-gray-500',
    limits: { ads: 1, statistics: false }
  },
  premium: {
    label: '💎 Премиум',
    color: 'bg-gold-500',
    limits: { ads: 'unlimited', statistics: true }
  }
};

interface MainDashboardProps {
  currentRole?: UserRole;
  accountType?: 'basic' | 'premium';
}

const MainDashboard: React.FC<MainDashboardProps> = ({ 
  currentRole = 'seller', 
  accountType = 'basic' 
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [selectedAccountType, setSelectedAccountType] = useState<'basic' | 'premium'>(accountType);

  // 📊 Моковые данные для демонстрации
  const mockStats: DashboardStats = {
    totalAds: 1247,
    activeAds: 892,
    pendingAds: 23,
    rejectedAds: 15,
    totalViews: 45678,
    todayViews: 234,
    averagePrice: 15500,
    totalUsers: 5432
  };

  // 🎯 Получить конфигурацию текущей роли
  const currentRoleConfig = ROLE_CONFIG[selectedRole];
  const currentAccountConfig = ACCOUNT_TYPES[selectedAccountType];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 🎭 Заголовок с переключателем ролей */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                🚗 AutoRia Clone Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Полная демонстрация возможностей платформы
              </p>
            </div>
            
            {/* 💎 Тип аккаунта */}
            <div className="flex items-center gap-4">
              <Badge className={`${currentAccountConfig.color} text-white`}>
                {currentAccountConfig.label}
              </Badge>
              <Badge className={`${currentRoleConfig.color} text-white`}>
                {currentRoleConfig.label}
              </Badge>
            </div>
          </div>

          {/* 🎛️ Переключатель ролей для демонстрации */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🎭 Демонстрация ролей:
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <Button
                  key={role}
                  onClick={() => setSelectedRole(role as UserRole)}
                  variant={selectedRole === role ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <config.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs text-gray-500 text-center">
                    {config.description}
                  </span>
                </Button>
              ))}
            </div>

            {/* 💎 Переключатель типа аккаунта */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <span className="text-sm font-medium text-gray-700">Тип аккаунта:</span>
              {Object.entries(ACCOUNT_TYPES).map(([type, config]) => (
                <Button
                  key={type}
                  onClick={() => setSelectedAccountType(type as 'basic' | 'premium')}
                  variant={selectedAccountType === type ? "default" : "outline"}
                  size="sm"
                >
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 📊 Основная статистика */}
        <DashboardStatsWidget />

        {/* 🎭 Контент в зависимости от роли */}
        <Tabs value={selectedRole} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <TabsTrigger key={role} value={role} className="flex items-center gap-2">
                <config.icon className="h-4 w-4" />
                {config.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 🛒 Dashboard Покупателя */}
          <TabsContent value="buyer" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🔍 Поиск автомобилей
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">Найдите автомобиль своей мечты</p>
                  <Button className="w-full">
                    🔍 Перейти к поиску
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ❤️ Избранное
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">Сохраненные объявления</p>
                  <div className="text-2xl font-bold">12</div>
                  <Button variant="outline" className="w-full">
                    📋 Посмотреть избранное
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 🚗 Dashboard Продавца */}
          <TabsContent value="seller" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ➕ Создать объявление
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    {selectedAccountType === 'basic' 
                      ? `Доступно: ${currentAccountConfig.limits.ads} объявление`
                      : 'Неограниченное количество объявлений'
                    }
                  </p>
                  <Button className="w-full">
                    🚗 Создать объявление
                  </Button>
                </CardContent>
              </Card>



              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {selectedAccountType === 'premium' ? '📈 Статистика' : '🔒 Статистика'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedAccountType === 'premium' ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Просмотры:</span>
                          <span className="font-bold">1,234</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Средняя цена:</span>
                          <span className="font-bold">$15,500</span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        📊 Подробная статистика
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 text-sm">
                        Статистика доступна только для Премиум аккаунтов
                      </p>
                      <Button className="w-full">
                        💎 Обновить до Премиум
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 🛡️ Dashboard Менеджера */}
          <TabsContent value="manager" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ⏳ Модерация объявлений
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Ожидают проверки:</span>
                      <Badge variant="destructive">{mockStats.pendingAds}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Отклонено сегодня:</span>
                      <Badge variant="outline">5</Badge>
                    </div>
                  </div>
                  <Button className="w-full">
                    🔍 Перейти к модерации
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    👥 Управление пользователями
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Всего пользователей:</span>
                      <span className="font-bold">{mockStats.totalUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Заблокированы:</span>
                      <Badge variant="destructive">12</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    👥 Управление пользователями
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 👑 Dashboard Администратора */}
          <TabsContent value="admin" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📊 Системная статистика
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Всего объявлений:</span>
                      <span className="font-bold">{mockStats.totalAds.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Пользователей:</span>
                      <span className="font-bold">{mockStats.totalUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Просмотров:</span>
                      <span className="font-bold">{mockStats.totalViews.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    📈 Подробная аналитика
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🗂️ Справочники
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Управление марками, моделями, регионами
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      🚗 Марки и модели
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      🌍 Регионы и города
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      🎨 Цвета
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ⚙️ Системные настройки
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Конфигурация системы
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      💱 Курсы валют
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      🤖 LLM модерация
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      📧 Уведомления
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* 🎯 Быстрые действия */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚡ Быстрые действия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <Car className="h-6 w-6" />
                <span>Создать объявление</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                <span>Статистика</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <Settings className="h-6 w-6" />
                <span>Настройки</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                <span>Профиль</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MainDashboard;
