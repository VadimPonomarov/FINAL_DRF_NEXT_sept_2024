"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  Plus,
  Search,
  User,
  TrendingUp,
  Shield,
  Zap,
  Star,
  ArrowRight,
  Globe2,
  Heart,
  MapPin,
  Calendar,
  Filter,
  ChevronRight,
  BarChart3,
  Settings,
  Bell
} from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

const ModernMainPage = () => {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'Всі', icon: <Car className="h-4 w-4" /> },
    { id: 'sedan', name: 'Седани', icon: <Car className="h-4 w-4" /> },
    { id: 'suv', name: 'SUV', icon: <Car className="h-4 w-4" /> },
    { id: 'sports', name: 'Спорткари', icon: <Car className="h-4 w-4" /> },
    { id: 'electric', name: 'Електро', icon: <Zap className="h-4 w-4" /> }
  ];

  const featuredCars = [
    {
      id: 1,
      title: 'Tesla Model 3',
      price: '$35,000',
      year: '2023',
      mileage: '15,000 km',
      location: 'Київ',
      image: '/api/placeholder/300/200',
      badge: 'Електро',
      rating: 4.8,
      views: 1234
    },
    {
      id: 2,
      title: 'BMW X5',
      price: '$45,000',
      year: '2022',
      mileage: '25,000 km',
      location: 'Львів',
      image: '/api/placeholder/300/200',
      badge: 'SUV',
      rating: 4.6,
      views: 892
    },
    {
      id: 3,
      title: 'Mercedes C-Class',
      price: '$38,000',
      year: '2023',
      mileage: '8,000 km',
      location: 'Одеса',
      image: '/api/placeholder/300/200',
      badge: 'Седан',
      rating: 4.7,
      views: 756
    }
  ];

  const stats = [
    { label: 'Активних оголошень', value: '1,247', icon: <Car className="h-5 w-5" />, color: 'from-blue-500 to-blue-600' },
    { label: 'Задоволених клієнтів', value: '5,432', icon: <User className="h-5 w-5" />, color: 'from-green-500 to-green-600' },
    { label: 'Середня ціна', value: '$15,500', icon: <TrendingUp className="h-5 w-5" />, color: 'from-purple-500 to-purple-600' },
    { label: 'Рейтинг платформи', value: '4.8/5', icon: <Star className="h-5 w-5" />, color: 'from-amber-500 to-orange-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      {/* Modern Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-sm opacity-75"></div>
                <div className="relative p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Car className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AutoRia Clone
                </h1>
                <p className="text-xs text-muted-foreground">Знайди свій ідеальний автомобіль</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
                <Settings className="h-4 w-4" />
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <User className="h-4 w-4 mr-2" />
                Увійти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-4 py-2">
                🔥 Найкращі пропозиції цього місяця
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Знайди свій ідеальний автомобіль
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Тисячі перевірених оголошень від надійних продавців по всій Україні
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-border/50 shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Пошук за маркою, моделлю або ключовим словом..."
                          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8">
                      <Search className="h-4 w-4 mr-2" />
                      Пошук
                    </Button>
                  </div>
                  
                  {/* Quick Filters */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button variant="outline" size="sm" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      Київ
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      <DollarSign className="h-3 w-3 mr-1" />
                      До $50k
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      2022+
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Filter className="h-3 w-3 mr-1" />
                      Всі фільтри
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-lg bg-gradient-to-r text-white", stat.color)}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Популярні категорії</h2>
            <p className="text-muted-foreground">Оберіть тип автомобіля, який вас цікавить</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 hover:scale-105",
                  activeCategory === category.id && "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0"
                )}
              >
                {category.icon}
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Cars */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Рекомендовані автомобілі</h2>
              <p className="text-muted-foreground">Найкращі пропозиції, підібрані спеціально для вас</p>
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              Переглянути всі
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCars.map((car) => (
              <Card key={car.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-border/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-gray-700 dark:to-gray-800 rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Car className="h-16 w-16 text-slate-400 dark:text-gray-600" />
                    </div>
                  </div>
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-white/90 dark:bg-gray-800/90 text-black dark:text-white border-0">
                      {car.badge}
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-white/90 dark:bg-gray-800/90">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                        {car.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{car.year}</span>
                        <span>{car.mileage}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {car.location}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-blue-600">
                        {car.price}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-current" />
                        <span className="text-sm font-medium">{car.rating}</span>
                        <span className="text-sm text-muted-foreground">({car.views})</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        Детальніше
                      </Button>
                      <Button variant="outline">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Готові продати свій автомобіль?
              </h2>
              <p className="text-xl mb-8 text-blue-100">
                Створіть оголошення за 5 хвилин і отримайте пропозиції від тисяч покупців
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                  <Plus className="h-4 w-4 mr-2" />
                  Створити оголошення
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8">
                  Дізнатися більше
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-border/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Car className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg">AutoRia Clone</span>
              </div>
              <p className="text-muted-foreground">
                Найкраща платформа для купівлі та продажу автомобілів в Україні
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Посилання</h3>
              <div className="space-y-2">
                <Link href="#" className="block text-muted-foreground hover:text-blue-600">Про нас</Link>
                <Link href="#" className="block text-muted-foreground hover:text-blue-600">Як це працює</Link>
                <Link href="#" className="block text-muted-foreground hover:text-blue-600">Ціни</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Підтримка</h3>
              <div className="space-y-2">
                <Link href="#" className="block text-muted-foreground hover:text-blue-600">Допомога</Link>
                <Link href="#" className="block text-muted-foreground hover:text-blue-600">Безпека</Link>
                <Link href="#" className="block text-muted-foreground hover:text-blue-600">Контакти</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Мобільний додаток</h3>
              <p className="text-muted-foreground mb-4">
                Завантажте наш додаток для iOS та Android
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">App Store</Button>
                <Button variant="outline" size="sm">Google Play</Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border/50 mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 AutoRia Clone. Всі права захищено.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ModernMainPage;
