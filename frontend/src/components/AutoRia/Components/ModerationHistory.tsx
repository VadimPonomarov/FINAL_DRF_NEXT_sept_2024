"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  History,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface ModerationHistoryEntry {
  id: number;
  timestamp: string;
  moderator: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  action: 'approve' | 'reject' | 'block' | 'activate' | 'review' | 'needs_review';
  old_status: string;
  new_status: string;
  reason?: string;
  notes?: string;
}

interface ModerationHistoryProps {
  adId: number;
  onClose?: () => void;
}

const ModerationHistory: React.FC<ModerationHistoryProps> = ({ adId, onClose }) => {
  const { t, formatDate } = useI18n();
  const [history, setHistory] = useState<ModerationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModerationHistory();
  }, [adId]);

  const loadModerationHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Заменить на реальный API endpoint
      // const response = await fetch(`/api/ads/${adId}/moderation-history`);
      // const result = await response.json();

      // Временные мок данные для демонстрации
      const mockHistory: ModerationHistoryEntry[] = [
        {
          id: 1,
          timestamp: '2024-01-15T14:30:00Z',
          moderator: {
            id: 1,
            email: 'moderator@example.com',
            first_name: 'Менеджер',
            last_name: 'Платформы'
          },
          action: 'approve',
          old_status: 'pending',
          new_status: 'active',
          reason: 'Объявление соответствует всем требованиям платформы'
        },
        {
          id: 2,
          timestamp: '2024-01-14T10:15:00Z',
          moderator: {
            id: 2,
            email: 'automoderator@system.com',
            first_name: 'Авто',
            last_name: 'Модератор'
          },
          action: 'needs_review',
          old_status: 'draft',
          new_status: 'pending',
          reason: 'Объявление отправлено на модерацию после создания'
        },
        {
          id: 3,
          timestamp: '2024-01-10T16:45:00Z',
          moderator: {
            id: 1,
            email: 'moderator@example.com',
            first_name: 'Менеджер',
            last_name: 'Платформы'
          },
          action: 'reject',
          old_status: 'active',
          new_status: 'rejected',
          reason: 'Обнаружены признаки нарушения правил платформы'
        }
      ];

      // Сортируем по времени (самые свежие первыми)
      mockHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistory(mockHistory);

    } catch (error) {
      console.error('[ModerationHistory] Failed to load history:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'reject':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'block':
        return <Ban className="h-4 w-4 text-red-600" />;
      case 'activate':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'review':
      case 'needs_review':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels = {
      approve: 'Одобрено',
      reject: 'Отклонено',
      block: 'Заблокировано',
      activate: 'Активировано',
      review: 'Отправлено на проверку',
      needs_review: 'Требует проверки'
    };
    return labels[action as keyof typeof labels] || action;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Активно</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">На модерации</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Отклонено</Badge>;
      case 'blocked':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Заблокировано</Badge>;
      case 'draft':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Черновик</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-4">Загрузка истории модерации...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ошибка загрузки истории модерации: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <CardTitle>История модерации</CardTitle>
          </div>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          )}
        </div>
        <CardDescription>
          Полная история изменений статуса объявления #{adId}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              История модерации пуста
            </h3>
            <p className="text-gray-600">
              Для этого объявления еще не проводилась модерация
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={entry.id} className="border-l-4 border-blue-200 pl-4 pb-4 relative">
                {/* Timeline dot */}
                <div className="absolute -left-2 top-2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>

                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getActionIcon(entry.action)}
                    <span className="font-medium text-gray-900">
                      {getActionLabel(entry.action)}
                    </span>
                    <span className="text-sm text-gray-500">
                      #{entry.id}
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(entry.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Status change */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-gray-600">Статус:</span>
                  {getStatusBadge(entry.old_status)}
                  <span className="text-sm text-gray-400">→</span>
                  {getStatusBadge(entry.new_status)}
                </div>

                {/* Moderator */}
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {entry.moderator.first_name && entry.moderator.last_name
                      ? `${entry.moderator.first_name} ${entry.moderator.last_name}`
                      : entry.moderator.email
                    }
                  </span>
                </div>

                {/* Reason */}
                {entry.reason && (
                  <Alert className="mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Причина:</strong> {entry.reason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Notes */}
                {entry.notes && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    <strong>Заметки:</strong> {entry.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModerationHistory;