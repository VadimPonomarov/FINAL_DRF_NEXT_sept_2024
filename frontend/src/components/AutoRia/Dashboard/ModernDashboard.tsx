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
  Database,
  Search,
  Plus,
  Bell,
  Globe2,
  Menu,
  X,
  Home,
  Star,
  Zap,
  Target,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserRole = 'buyer' | 'seller' | 'manager' | 'admin';

interface DashboardStats {
  totalAds: number;
  activeAds: number;
  pendingAds: number;
  rejectedAds: number;
  totalViews: number;
  todayViews: number;
  averagePrice: number;
  totalUsers: number;
  premiumUsers: number;
  revenue: number;
  growth: number;
}

const ROLE_CONFIG = {
  buyer: {
    label: 'Покупатель',
    icon: ShoppingCart,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    textColor: 'text-blue-600 dark:text-blue-400'
  },
  seller: {
    label: 'Продавец',
    icon: Car,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    textColor: 'text-green-600 dark:text-green-400'
  },
  manager: {
    label: 'Менеджер',
    icon: Shield,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    textColor: 'text-orange-600 dark:text-orange-400'
  },
  admin: {
    label: 'Администратор',
    icon: Crown,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    textColor: 'text-purple-600 dark:text-purple-400'
  }
};

interface ModernDashboardProps {
  currentRole?: UserRole;
}

const ModernDashboard: React.FC<ModernDashboardProps> = ({ 
  currentRole = 'seller'
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);

  const mockStats: DashboardStats = {
    totalAds: 1247,
    activeAds: 892,
    pendingAds: 23,
    rejectedAds: 15,
    totalViews: 45678,
    todayViews: 234,
    averagePrice: 15500,
    totalUsers: 5432,
    premiumUsers: 156,
    revenue: 45600,
    growth: 12.5
  };

  const currentRoleConfig = ROLE_CONFIG[selectedRole];

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon, 
    color, 
    trend 
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color: string;
    trend?: 'up' | 'down';
  }) => (
    <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", color)}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {change}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
                  AutoRia Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">Modern Control Panel</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
                <Settings className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Role Selector */}
        <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
                <p className="text-muted-foreground">Complete platform management</p>
              </div>
              <Badge className={cn("bg-gradient-to-r text-white border-0", currentRoleConfig.color)}>
                {currentRoleConfig.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <Button
                  key={role}
                  onClick={() => setSelectedRole(role as UserRole)}
                  variant={selectedRole === role ? "default" : "outline"}
                  className={cn(
                    "h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105",
                    selectedRole === role && "bg-gradient-to-r text-white border-0 " + config.color
                  )}
                >
                  <config.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{config.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Всього оголошень"
            value={mockStats.totalAds.toLocaleString()}
            change={12.5}
            trend="up"
            icon={<Car className="h-5 w-5 text-white" />}
            color="bg-gradient-to-r from-blue-500 to-blue-600"
          />
          <StatCard
            title="Активних оголошень"
            value={mockStats.activeAds.toLocaleString()}
            change={8.2}
            trend="up"
            icon={<Activity className="h-5 w-5 text-white" />}
            color="bg-gradient-to-r from-green-500 to-green-600"
          />
          <StatCard
            title="Всього користувачів"
            value={mockStats.totalUsers.toLocaleString()}
            change={15.3}
            trend="up"
            icon={<Users className="h-5 w-5 text-white" />}
            color="bg-gradient-to-r from-purple-500 to-purple-600"
          />
          <StatCard
            title="Преміум користувачів"
            value={mockStats.premiumUsers.toLocaleString()}
            change={22.1}
            trend="up"
            icon={<Crown className="h-5 w-5 text-white" />}
            color="bg-gradient-to-r from-amber-500 to-orange-600"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Actions */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button className="h-auto p-4 flex flex-col items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0">
                    <Plus className="h-6 w-6" />
                    <span className="text-sm">Створити</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-gray-800">
                    <Search className="h-6 w-6" />
                    <span className="text-sm">Пошук</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-gray-800">
                    <BarChart3 className="h-6 w-6" />
                    <span className="text-sm">Аналітика</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-gray-800">
                    <Settings className="h-6 w-6" />
                    <span className="text-sm">Налаштування</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { icon: <Car className="h-4 w-4" />, title: "New ad created", time: "2 min ago", color: "text-blue-600" },
                    { icon: <User className="h-4 w-4" />, title: "New user registered", time: "15 min ago", color: "text-green-600" },
                    { icon: <DollarSign className="h-4 w-4" />, title: "Payment received", time: "1 hour ago", color: "text-amber-600" },
                    { icon: <Shield className="h-4 w-4" />, title: "Ad approved", time: "2 hours ago", color: "text-purple-600" }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-slate-100 dark:bg-gray-800", activity.color)}>
                          {activity.icon}
                        </div>
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Performance */}
            <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Revenue</span>
                    <span className="font-bold">${mockStats.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Growth</span>
                    <span className="font-bold text-green-600">+{mockStats.growth}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Price</span>
                    <span className="font-bold">${mockStats.averagePrice.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language Selector */}
            <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5" />
                  Language
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
                    { code: 'en', name: 'English', flag: '🇺🇸' },
                    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
                  ].map((lang) => (
                    <Button
                      key={lang.code}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
