"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Search,
  Filter,
  UserX,
  UserCheck,
  AlertTriangle,
  Ban,
  Clock,
  Mail,
  Phone
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthProviderContext';

interface UserModerationData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_banned: boolean;
  banned_at?: string;
  banned_by?: number;
  banned_reason?: string;
  total_ads: number;
  active_ads: number;
  rejected_ads: number;
  last_login?: string;
  created_at: string;
}

const UserModerationPage = () => {
  const { t, formatDate } = useI18n();
  const { user } = useAuth();

  const [users, setUsers] = useState<UserModerationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserModerationData | null>(null);

  // Проверка прав доступа - только менеджеры и админы
  const canModerate = React.useMemo(() => {
    return user?.is_staff || user?.is_superuser || false;
  }, [user]);

  useEffect(() => {
    if (canModerate) {
      loadUsers();
    }
  }, [searchQuery, filterStatus, canModerate]);

  const loadUsers = async () => {
    if (!canModerate) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        status: filterStatus,
        page_size: '50'
      });

      // TODO: Заменить на реальный API endpoint для модерации пользователей
      // const response = await fetch(`/api/users/moderation?${params}`);
      // const result = await response.json();

      // Временные мок данные для демонстрации
      const mockUsers: UserModerationData[] = [
        {
          id: 1,
          email: 'suspicious@example.com',
          first_name: 'Подозрительный',
          last_name: 'Пользователь',
          is_active: true,
          is_banned: false,
          total_ads: 5,
          active_ads: 2,
          rejected_ads: 3,
          last_login: '2024-01-15T10:30:00Z',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          email: 'banned@example.com',
          first_name: 'Заблокированный',
          last_name: 'Пользователь',
          is_active: false,
          is_banned: true,
          banned_at: '2024-01-10T15:45:00Z',
          banned_by: 1,
          banned_reason: 'Множественные нарушения правил платформы',
          total_ads: 8,
          active_ads: 0,
          rejected_ads: 8,
          last_login: '2024-01-10T14:20:00Z',
          created_at: '2023-12-01T00:00:00Z'
        }
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('[UserModeration] Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (userId: number, reason: string) => {
    try {
      // TODO: Заменить на реальный API вызов
      console.log(`[UserModeration] Banning user ${userId} with reason: ${reason}`);

      // Временная реализация
      toast({ title: '✅ ' + t('common.success'), description: `${t('moderation.userBlocked')}: ${reason}` });

      // Обновить локальное состояние
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, is_banned: true, is_active: false, banned_reason: reason }
          : u
      ));

      setSelectedUser(null);
    } catch (error) {
      console.error('[UserModeration] Error banning user:', error);
      toast({ title: '❌ ' + t('common.error'), description: t('moderation.errorBlocking'), variant: 'destructive' });
    }
  };

  const unbanUser = async (userId: number) => {
    try {
      // TODO: Заменить на реальный API вызов
      console.log(`[UserModeration] Unbanning user ${userId}`);

      // Временная реализация
      toast({ title: '✅ ' + t('common.success'), description: t('moderation.userUnblocked') });

      // Обновить локальное состояние
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, is_banned: false, is_active: true, banned_reason: undefined }
          : u
      ));
    } catch (error) {
      console.error('[UserModeration] Error unbanning user:', error);
      toast({ title: '❌ ' + t('common.error'), description: t('moderation.errorUnblocking'), variant: 'destructive' });
    }
  };

  if (!canModerate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('accessDenied.moderatorRequired')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-red-600" />
              Модерация пользователей
            </h1>
            <p className="text-gray-600 mt-1">
              Управление пользователями платформы
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Поиск по email, имени..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">Все пользователи</option>
                <option value="active">Активные</option>
                <option value="banned">Заблокированные</option>
                <option value="suspicious">Подозрительные</option>
              </select>
              <Button
                onClick={loadUsers}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Обновить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <span className="ml-4">Загрузка...</span>
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Пользователей не найдено
                </h3>
                <p className="text-gray-600">
                  Нет пользователей для модерации с выбранными фильтрами
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {users.map(user => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {user.first_name} {user.last_name}
                        {user.is_banned && <Ban className="h-4 w-4 text-red-600" />}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.is_banned ? (
                        <Badge className="bg-red-100 text-red-800 border-red-300">
                          Заблокирован
                        </Badge>
                      ) : user.is_active ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          Активен
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                          Неактивен
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Статистика объявлений */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-blue-600">{user.total_ads}</div>
                        <div className="text-gray-600">Всего объявлений</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-semibold text-green-600">{user.active_ads}</div>
                        <div className="text-gray-600">Активных</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="font-semibold text-red-600">{user.rejected_ads}</div>
                        <div className="text-gray-600">Отклонено</div>
                      </div>
                    </div>

                    {/* Причина блокировки */}
                    {user.banned_reason && (
                      <Alert className="border-red-200 bg-red-50">
                        <Ban className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Причина блокировки:</strong><br />
                          {user.banned_reason}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Действия модерации */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Подробности
                      </Button>

                      {!user.is_banned ? (
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => {
                            const reason = prompt('Причина блокировки:');
                            if (reason) {
                              banUser(user.id, reason);
                            }
                          }}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Заблокировать
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => unbanUser(user.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Разблокировать
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserModerationPage;