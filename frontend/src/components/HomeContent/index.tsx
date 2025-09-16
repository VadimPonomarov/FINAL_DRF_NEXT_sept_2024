"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Car,
  Plus,
  Search,
  Heart,
  BarChart3,
  User,
  Star,
  TrendingUp,
  Shield,
  Zap,
  Terminal,
  Lock,
  LogIn
} from 'lucide-react';
import NewResizableWrapper from '@/components/All/ResizableWrapper/NewResizableWrapper';
import { useSession, signOut, getSession } from 'next-auth/react';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { AuthProvider } from '@/common/constants/constants';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthProviderContext';
import AnimatedPlatformStatsWidget from '@/components/AutoRia/Statistics/AnimatedPlatformStatsWidget';
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler';

// 🎭 LIGHTWEIGHT ANIMATION SYSTEM (dev-optimized) 🎭
const useSpectacularAnimation = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [animationStage, setAnimationStage] = useState(0);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);

  useEffect(() => {
    const hasSeenShow = localStorage.getItem('autoria-spectacular-show-seen');
    const isDev = process.env.NODE_ENV === 'development';

    if (!hasSeenShow) {
      setShowWelcome(true);
      localStorage.setItem('autoria-spectacular-show-seen', 'true');

      if (isDev) {
        // Dev mode: skip heavy animations, show final state quickly
        setTimeout(() => setAnimationStage(8), 100);
        setParticles([]); // No particles in dev
      } else {
        // Production: full animation experience
        const particleArray = Array.from({ length: 20 }, (_, i) => ({ // Reduced from 50 to 20
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: Math.random() * 1500 // Reduced delay
        }));
        setParticles(particleArray);

        // Faster timeline for production
        const showTimeline = [
          { delay: 0, stage: 1 },
          { delay: 500, stage: 2 },
          { delay: 1000, stage: 3 },
          { delay: 1500, stage: 4 },
          { delay: 2000, stage: 5 },
          { delay: 2500, stage: 6 },
          { delay: 3000, stage: 7 },
          { delay: 3500, stage: 8 },
        ];

        showTimeline.forEach(({ delay, stage }) => {
          setTimeout(() => setAnimationStage(stage), delay);
        });
      }
    } else {
      setAnimationStage(8);
    }
  }, []);

  return { showWelcome, animationStage, particles };
};

// 🎨 Lightweight counter animation (dev-optimized)
const useSpectacularCounter = (target: number, shouldAnimate: boolean, duration: number = 1000) => {
  const [count, setCount] = useState(0);
  const [isGlowing, setIsGlowing] = useState(false);

  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';

    if (!shouldAnimate || isDev) {
      // Dev mode: instant display, no animation
      setCount(target);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Simplified easing for better performance
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(target * easeOut);
      setCount(currentCount);

      // Simplified glow effect
      if (progress > 0.7 && progress < 0.9) {
        setIsGlowing(true);
      } else {
        setIsGlowing(false);
      }

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Final glow burst
        setIsGlowing(true);
        setTimeout(() => setIsGlowing(false), 500);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [target, shouldAnimate, duration]);

  return { count, isGlowing };
};

// 🎪 Spectacular staggered animation with multiple effects
const useSpectacularStagger = (itemCount: number, shouldAnimate: boolean, delay: number = 200) => {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [glowingItems, setGlowingItems] = useState<number[]>([]);

  useEffect(() => {
    if (!shouldAnimate) {
      setVisibleItems(Array.from({ length: itemCount }, (_, i) => i));
      return;
    }

    setVisibleItems([]);
    setGlowingItems([]);

    const timeouts: NodeJS.Timeout[] = [];

    for (let i = 0; i < itemCount; i++) {
      // Staggered entrance
      const entranceTimeout = setTimeout(() => {
        setVisibleItems(prev => [...prev, i]);

        // Add glow effect
        setTimeout(() => {
          setGlowingItems(prev => [...prev, i]);

          // Remove glow after effect
          setTimeout(() => {
            setGlowingItems(prev => prev.filter(item => item !== i));
          }, 800);
        }, 200);
      }, i * delay);

      timeouts.push(entranceTimeout);
    }

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [itemCount, shouldAnimate, delay]);

  return { visibleItems, glowingItems };
};

// Animation hooks removed to fix React hooks error

// Animation hooks removed

// Dummy provider content
const dummyProviderContent = `
# 📝 DummyJSON SPA: Завдання для фронтенду

[Документація API](https://dummyjson.com/docs)

> Сайт, на якому знаходиться акумульована інформація з dummyjson.com про користувачів та рецепти.

---

> **📝 Завдання:**
>
> Реалізуйте SPA-додаток, який дозволяє:
> - Авторизуватись через форму логіну (будь-який користувач dummyjson)
> - Переглядати та шукати користувачів і рецепти
> - Переглядати деталі користувача та його рецепти
> - Переглядати деталі рецепту, фільтрувати за тегами
> - Використовувати пагінацію для всіх списків
> - Дотримуватись сучасного дизайну та використовувати Redux для стейту

---

## 🧩 Обов'язкові компоненти

- **Меню**: містить лінки на сторінки та лого залогіненого користувача. Якщо користувач не аутентифікований — тільки лінка на сторінку аутентифікації.
- **Пошук**: шукає рецепт або користувача в залежності від сторінки. Один текстовий інпут (і кнопка за бажанням). Пошук за стрінговим значенням або ID згідно [документації](https://dummyjson.com/docs).
- **Пагінація**: всі списки даних мають бути пагіновані.

---

## 🏠 Головна сторінка
- За замовчуванням користувач не залогінений.
- Є повідомлення про необхідність аутентифікації.
- В меню — лише лінка на сторінку входу.

---

## 🔑 Сторінка аутентифікації
- Форма з інпутами для входу через dummyjson.
- Дані для входу — з будь-якого користувача dummyjson.
- Після входу в меню з'являються лінки на сторінку всіх рецептів, всіх користувачів та лого користувача (з об'єкта).

---

## 👥 Сторінка користувачів
- Меню, пошук, список користувачів (мінімум 3 поля).
- Клік по користувачу — детальна сторінка (7-10 полів) + список його рецептів.
- Клік по рецепту — детальна сторінка рецепту.

---

## 🍲 Сторінка рецептів
- Меню, пошук, список рецептів (назва + теги).
- Клік по рецепту — детальна сторінка + лінка на автора.
- Клік по тегу — фільтрація/пошук всіх рецептів з цим тегом.

---

## 🎨 Дизайн та технології
- Дизайн — довільний, сучасний, адаптивний.
- Всі списки — пагіновані.
- Стейт — тільки через **Redux**.
`;

// Backend provider content
const backendProviderContent = `
# 🛠️ DRF Lessons: Backend API Documentation

> Цей документ описує архітектуру та основні можливості **Backend** частини проекту, розробленої на **Django Rest Framework**.

---

## ✨ Ключові Можливості

- **🔐 JWT-Аутентифікація**: Безпечний доступ до API за допомогою \`access\` та \`refresh\` токенів.
- **👤 Керування Користувачами**: Повний CRUD для профілів, завантаження аватарів, валідація email та зміна паролю.
- **💬 AI Чат-система**: Інтеграція з AI моделями для обробки повідомлень та генерації відповідей.
- **📚 Документація API**: Інтерактивна документація **Swagger** доступна за посиланням \`/api/doc/\`.
- **⚙️ Фонові Задачі**: Використання **Celery** та **RabbitMQ** для відправки пошти, очищення файлів та виконання періодичних завдань.
- **🔗 Інтеграції**: Взаємодія з **Minio** для зберігання файлів, **Redis** для кешування та черг.

---

## 🏛️ Архітектура та Сценарії

### 1. **Вхід в систему**
   - Користувач відправляє \`логін/пароль\` на \`/api/auth/token/\`.
   - Система повертає \`JWT\` токени у відповідь.
   - Refresh токен використовується для оновлення access токена.

### 2. **Робота з профілем**
   - Перегляд списку користувачів через \`/api/users/\`.
   - Доступ до детального профілю через \`/api/users/{id}/\`.
   - Можливість змінити аватар, email або пароль.
   - Активація користувача через токен.

### 3. **AI Чат-система**
   - Відправка повідомлень через \`/api/chat/\`.
   - Отримання відповідей від AI моделей.
   - Збереження історії чату.
   - Інтеграція з різними AI провайдерами.

### 4. **Асинхронні операції**
   - Відправка листів при реєстрації через Celery.
   - Періодичне очищення тимчасових медіафайлів.
   - Генерація звітів на вимогу.
   - Обробка файлів та зображень.

---

## 🔧 Технічний Стек

- **Backend**: Django Rest Framework, Django Channels
- **База даних**: PostgreSQL
- **Кешування**: Redis
- **Черги**: Celery + RabbitMQ
- **Файлове сховище**: MinIO
- **Документація**: drf-yasg (Swagger)
- **WebSocket**: Django Channels + Redis

---

## 📊 Моніторинг та Логування

- **Flower**: Моніторинг Celery завдань
- **Redis Insight**: Візуалізація Redis даних
- **RabbitMQ Management**: Управління чергами
- **MinIO Console**: Управління файлами

---

> **🚀 Початок роботи:**
> Для ознайомлення з усіма ендпоінтами перейдіть до **[Swagger документації](/api/doc/)**.
`;

interface HomeContentProps {
  serverSession?: any;
}

const HomeContent: React.FC<HomeContentProps> = ({ serverSession }) => {
  console.log('🚀 [HomeContent] Component is rendering!');
  console.log('🚀 [HomeContent] Server session:', serverSession);

  const { data: session, status: sessionStatus } = useSession();
  const { provider, setProvider } = useAuthProvider();
  const { t, formatNumber, locale, setLocale } = useI18n();

  // Инициализируем обработчик критических ошибок API
  const { trackError, forceRedirect, criticalErrorCount } = useApiErrorHandler({
    enableAutoRedirect: true,
    criticalErrorThreshold: 3,
    onCriticalError: () => {
      console.log('[HomeContent] Critical API errors detected, forcing redirect to /signin');
    },
    onBackendUnavailable: () => {
      console.warn('[HomeContent] Backend appears to be unavailable');
    }
  });

  // Дополнительная проверка API сессии
  useEffect(() => {
    const checkApiSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const apiSession = await response.json();
        console.log('[HomeContent] API Session check:', apiSession);
      } catch (error) {
        console.error('[HomeContent] API Session error:', error);
      }
    };

    checkApiSession();
  }, []);

  // Слушаем изменения провайдера для принудительной перерисовки
  useEffect(() => {
    const handleAuthProviderChanged = (event: CustomEvent) => {
      console.log('[HomeContent] Auth provider changed event received:', event.detail.provider);
      // Принудительная перерисовка произойдет автоматически через useAuthProvider
    };

    window.addEventListener('authProviderChanged', handleAuthProviderChanged as EventListener);

    return () => {
      window.removeEventListener('authProviderChanged', handleAuthProviderChanged as EventListener);
    };
  }, []);

  // Глобальное отслеживание ошибок теперь настроено в RootProvider
  // Здесь только локальная логика для HomeContent


  const [isProviderLoading, setIsProviderLoading] = useState(false); // Изменено на false для предотвращения hydration mismatch
  const [isMounted, setIsMounted] = useState(false); // Добавляем флаг монтирования
  // 🎭 SPECTACULAR ANIMATION SYSTEM 🎭
  const { showWelcome, animationStage, particles } = useSpectacularAnimation();

  // Features array (always define)
  const features = [
    {
      icon: <Search className="h-8 w-8 text-blue-600" />,
      title: t('searchTitle'),
      description: t('searchDesc'),
      href: "/autoria/search",
      color: "blue"
    },
    {
      icon: <Plus className="h-8 w-8 text-green-600" />,
      title: t('autoria.createAd') || "Create Ad",
      description: t('autoria.createAdDesc') || "Sell your car by creating a detailed advertisement",
      href: "/autoria/create-ad",
      color: "green"
    },
    {
      icon: <User className="h-8 w-8 text-purple-600" />,
      title: t('profile.title'),
      description: t('profile.personalInfo'),
      href: "/autoria/profile",
      color: "purple"
    },
    {
      icon: <Heart className="h-8 w-8 text-red-600" />,
      title: t('favoritesTitle'),
      description: t('favoritesDesc'),
      href: "/autoria/favorites",
      color: "red"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-indigo-600" />,
      title: t('autoria.analytics') || "Analytics",
      description: t('autoria.analyticsDesc') || "View statistics and performance data",
      href: "/autoria/analytics",
      color: "indigo",
      badge: <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">Premium</Badge>
    }
  ];

  // 🎪 Spectacular feature cards animation
  const { visibleItems: visibleFeatures, glowingItems: glowingFeatures } = useSpectacularStagger(
    features.length,
    showWelcome && animationStage >= 6,
    300
  );



  // Утилитная функция для проверки валидности сессии
  const isValidSession = (session: any): boolean => {
    if (!session) return false;

    // Проверяем наличие обязательного поля email
    if (!session.email) return false;

    // Проверяем, что это наша кастомная структура сессии
    if (session.user && !session.accessToken) {
      // Это стандартная NextAuth сессия без нашей кастомной структуры
      return false;
    }

    return true;
  };

  // Effect hooks (always call)
  useEffect(() => {
    // Устанавливаем флаг монтирования для предотвращения hydration mismatch
    setIsMounted(true);

    if (provider !== AuthProvider.Select) {
      setIsProviderLoading(false);
    }
  }, [provider]);

  // Дополнительный useEffect для обработки клиентского рендера
  useEffect(() => {
    // Этот эффект запускается только на клиенте после монтирования
    if (typeof window !== 'undefined') {
      setIsMounted(true);
    }
  }, []);

  // Состояние для обратного отсчета (должно быть до условных рендеров)
  const [countdown, setCountdown] = useState(10);

  // Определяем сессию: приоритет серверной сессии, затем клиентской
  const currentSession = serverSession || session;
  // После восстановления оригинального session callback, сессия имеет кастомную структуру { email, accessToken, expiresOn }
  const isAuthenticated = !!(currentSession?.email);
  const isLoading = sessionStatus === 'loading' || !isMounted;

  // Проверяем на некорректную сессию используя утилитную функцию
  const isCorruptedSession = currentSession &&
    !isValidSession(currentSession) &&
    sessionStatus !== 'loading' &&
    sessionStatus !== 'unauthenticated' &&
    isMounted;

  console.log('[HomeContent] NextAuth Session Check:', {
    serverSession: serverSession,
    clientSession: session,
    currentSession: currentSession,
    sessionStatus,
    isAuthenticated,
    isCorruptedSession,
    provider,
    isMounted,
    userEmail: currentSession?.email || 'none',
    'currentSession structure': currentSession ? Object.keys(currentSession) : 'null',
    'currentSession type': typeof currentSession,
    'currentSession is null': currentSession === null,
    'currentSession is undefined': currentSession === undefined,
    'has email': !!currentSession?.email,
    'session email': currentSession?.email,
    'will show content': isAuthenticated ? `${provider} content` : 'login form'
  });

  // Автоматическая очистка некорректных сессий
  useEffect(() => {
    if (isCorruptedSession && isMounted) {
      console.log('[HomeContent] Detected corrupted session, attempting to fix...');

      // Сначала пробуем обновить сессию
      getSession().then(updatedSession => {
        console.log('[HomeContent] Attempted session refresh:', updatedSession);

        // Если обновленная сессия все еще некорректна, очищаем
        if (!isValidSession(updatedSession)) {
          console.log('[HomeContent] Session refresh failed, clearing all data...');

          // Очищаем NextAuth сессию
          signOut({ redirect: false }).then(() => {
            console.log('[HomeContent] NextAuth session cleared');

            // Очищаем localStorage
            localStorage.clear();

            // Очищаем sessionStorage
            sessionStorage.clear();

            // Небольшая задержка перед перезагрузкой
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }).catch(error => {
            console.error('[HomeContent] Error clearing session:', error);
            // В случае ошибки все равно очищаем storage и перезагружаем
            localStorage.clear();
            sessionStorage.clear();
            setTimeout(() => {
              window.location.reload();
            }, 100);
          });
        }
      }).catch(error => {
        console.error('[HomeContent] Error refreshing session:', error);
        // Если не удалось обновить сессию, очищаем
        localStorage.clear();
        sessionStorage.clear();
        signOut({ redirect: false }).finally(() => {
          setTimeout(() => {
            window.location.reload();
          }, 100);
        });
      });
    }
  }, [isCorruptedSession, isMounted]);

  // Таймер обратного отсчета - запускается ВСЕГДА когда нет сессии
  useEffect(() => {
    console.log('[HomeContent] Timer check:', {
      isAuthenticated,
      sessionStatus,
      isMounted,
      serverSession: serverSession ? 'exists' : 'null',
      clientSession: session ? 'exists' : 'null'
    });

    // Если пользователь не авторизован и компонент смонтирован - запускаем таймер
    if (!isAuthenticated && isMounted) {
      console.log('[HomeContent] User not authenticated, starting countdown timer');

      setCountdown(10); // Сбрасываем на 10 секунд

      const interval = setInterval(() => {
        setCountdown(prev => {
          const newValue = prev - 1;
          console.log('[HomeContent] Countdown:', newValue);

          if (newValue <= 0) {
            console.log('[HomeContent] Redirecting to /login');
            window.location.href = '/login';
            return 0;
          }
          return newValue;
        });
      }, 1000);

      return () => {
        console.log('[HomeContent] Clearing countdown timer');
        clearInterval(interval);
      };
    }
  }, [isAuthenticated, isMounted]);





  // Показываем загрузку, пока провайдер не определился
  if (isProviderLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <NewResizableWrapper
          centered={true}
          storageKey="loading-alert"
          defaultWidth={400}
          defaultHeight={200}
          minWidth={300}
          minHeight={150}
        >
          <Alert className="max-w-md !bg-black !text-white border-gray-800 shadow-lg">
            <Terminal className="h-4 w-4 !text-green-400" />
            <AlertTitle className="text-green-400 font-mono">Loading...</AlertTitle>
            <AlertDescription className="font-mono">
              Initializing application...
            </AlertDescription>
          </Alert>
        </NewResizableWrapper>
      </div>
    );
  }

  // Финальная отладочная информация
  console.log('[HomeContent] Final Render Decision:', {
    sessionStatus,
    provider,
    isLoading,
    isAuthenticated,
    isMounted,
    countdown,
    'Will show': !isAuthenticated ? 'Auth Block' : (provider === AuthProvider.Dummy ? 'Dummy' : 'AutoRia')
  });

  // Показываем загрузку, пока состояние не определилось
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Дополнительная защита: если обнаружена некорректная сессия, показываем загрузку
  if (isCorruptedSession) {
    console.log('[HomeContent] Corrupted session detected, showing loading while cleaning...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Очистка сессии...</p>
          <p className="text-gray-500 text-sm mt-2">Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }

  // Если пользователь не авторизован - показываем форму авторизации
  if (!isAuthenticated) {
    console.log('[HomeContent] User not authenticated - showing auth required form, countdown:', countdown);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Card className="w-full max-w-md shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Lock className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Требуется авторизация
                  </h2>
                  <p className="text-slate-600 mb-4">
                    Для доступа к функциям платформы необходимо войти в систему
                  </p>
                  <p className="text-sm text-slate-500 mb-6">
                    Автоматический переход через <span className="font-bold text-blue-600">{countdown}</span> секунд...
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link href="/login">
                      <Button className="w-full">
                        <LogIn className="h-4 w-4 mr-2" />
                        Войти в систему
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Если пользователь авторизован, показываем контент в зависимости от провайдера
  console.log('[HomeContent] User authenticated, checking provider:', {
    isAuthenticated,
    provider,
    'provider === Dummy': provider === AuthProvider.Dummy,
    'provider === MyBackendDocs': provider === AuthProvider.MyBackendDocs,
    'AuthProvider.Dummy': AuthProvider.Dummy,
    'AuthProvider.MyBackendDocs': AuthProvider.MyBackendDocs
  });

  if (provider === AuthProvider.Dummy) {
    // Для Dummy провайдера показываем описание проекта
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                  <Terminal className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DummyJSON SPA Project
                </CardTitle>
              </div>
              <CardDescription className="text-xl text-slate-600 max-w-2xl mx-auto">
                Проект для работы с DummyJSON API - демонстрация возможностей SPA приложения
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-lg max-w-none px-8 pb-8">
              <div
                className="text-slate-700 leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{
                  __html: dummyProviderContent
                    .replace(/\n/g, '<br/>')
                    .replace(/#{1,6}\s*([^\n]+)/g, '<h3 class="text-xl font-semibold text-slate-800 mt-6 mb-3">$1</h3>')
                    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
                    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-2 py-1 rounded text-sm font-mono">$1</code>')
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Для Backend провайдера показываем домашнюю страницу AutoRia
  // 🎭 ЕДИНАЯ АНИМАЦИОННАЯ ВЕРСИЯ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ 🎭
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
        {/* Debug buttons - левый верхний угол */}
        <div className="fixed top-[5px] left-[5px] z-[999999] p-[1px] flex gap-1">
          <button
            onClick={() => {
              localStorage.removeItem('autoria-spectacular-show-seen');
              window.location.reload();
            }}
            className="px-2 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[5px] font-bold rounded-full shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-300 animate-pulse"
            title="Reset the spectacular welcome animation"
          >
            🎭 Reset
          </button>

          <button
            onClick={() => {
              // Имитируем критические ошибки API
              console.log('[HomeContent] Testing API error tracking...');
              trackError('/api/public/reference/regions', 404);
              trackError('/api/ads/quick-stats', 404);
              trackError('/api/public/reference/brands', 500);
            }}
            className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[5px] font-bold rounded-full shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-300"
            title="Test API error tracking (simulate 404/500 errors)"
          >
            🚨 Test API
          </button>
        </div>

        {/* API Error Indicator - правый верхний угол */}
        {criticalErrorCount > 0 && (
          <div className="fixed top-[5px] right-[120px] z-[999999]">
            <div className="flex items-center gap-2 bg-red-500/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-medium">
                API Errors: {criticalErrorCount}
              </span>
              <button
                onClick={forceRedirect}
                className="text-white hover:text-red-200 text-xs underline"
                title="Force redirect to signin"
              >
                Fix
              </button>
            </div>
          </div>
        )}

        {/* Switch тоглер для переключения Dummy/Backend - правый верхний угол */}
        <div className="fixed top-[5px] right-[5px] z-[999999]">
          <button
            onClick={async () => {
              const newProvider = provider === AuthProvider.Dummy ? AuthProvider.MyBackendDocs : AuthProvider.Dummy;
              console.log('[HomeContent] Switching provider from', provider, 'to', newProvider);
              await setProvider(newProvider);
              console.log('[HomeContent] Provider switched successfully, components should re-render');
            }}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-sm hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all cursor-pointer"
            title={`Current: ${provider === AuthProvider.Dummy ? 'Dummy' : 'Backend'} | Click to switch to ${provider === AuthProvider.Dummy ? 'Backend' : 'Dummy'}`}
          >
            <span className={`text-[8px] font-medium transition-colors ${provider === AuthProvider.Dummy ? 'text-white' : 'text-white/60'}`}>
              D
            </span>
            <div
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                provider === AuthProvider.MyBackendDocs
                  ? 'bg-blue-600'
                  : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 transform rounded-full bg-white transition-transform ${
                  provider === AuthProvider.MyBackendDocs ? 'translate-x-2' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className={`text-[8px] font-medium transition-colors ${provider === AuthProvider.MyBackendDocs ? 'text-white' : 'text-white/60'}`}>
              B
            </span>
          </button>
        </div>

        {/* 🌍 LANGUAGE SELECTOR 🌍 */}
        <div className="absolute top-4 right-4 z-50 md:hidden">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg p-2">
            <span className="text-white text-sm font-medium">🌍</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as any)}
              className="bg-transparent text-white text-sm font-medium border-none outline-none cursor-pointer"
            >
              <option value="uk" className="bg-slate-800 text-white">🇺🇦 UK</option>
              <option value="ru" className="bg-slate-800 text-white">🇷🇺 RU</option>
              <option value="en" className="bg-slate-800 text-white">🇺🇸 EN</option>
            </select>
          </div>
        </div>

        {/* 🌌 SPECTACULAR COSMIC BACKGROUND 🌌 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Cosmic gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 transition-all duration-[5000ms] ${
            animationStage >= 1 ? 'opacity-100' : 'opacity-0'
          }`} />

          {/* Floating particles */}
          {particles.map((particle) => (
            <div
              key={particle.id}
              className={`absolute w-2 h-2 bg-white rounded-full transition-all duration-[4000ms] ${
                animationStage >= 1 ? 'opacity-60 animate-pulse' : 'opacity-0'
              }`}
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationDelay: `${particle.delay}ms`,
                transform: animationStage >= 1 ? 'scale(1)' : 'scale(0)',
              }}
            />
          ))}

          {/* Large cosmic orbs */}
          <div className={`absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl transition-all duration-[4000ms] ${
            animationStage >= 1 ? 'opacity-100 scale-100 animate-pulse' : 'opacity-0 scale-50'
          }`} />
          <div className={`absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full blur-3xl transition-all duration-[4000ms] delay-1000 ${
            animationStage >= 2 ? 'opacity-100 scale-100 animate-pulse' : 'opacity-0 scale-50'
          }`} />
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl transition-all duration-[4000ms] delay-2000 ${
            animationStage >= 3 ? 'opacity-100 scale-100 animate-pulse' : 'opacity-0 scale-50'
          }`} />

          {/* Shooting stars */}
          {animationStage >= 2 && (
            <>
              <div className="absolute top-20 left-10 w-1 h-1 bg-white rounded-full animate-ping" style={{animationDelay: '1s'}} />
              <div className="absolute top-40 right-20 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{animationDelay: '2s'}} />
              <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-blue-300 rounded-full animate-ping" style={{animationDelay: '3s'}} />
            </>
          )}
        </div>

        <div className="p-6 relative z-10">
          <div className={`max-w-7xl mx-auto transition-all duration-1000 ${
            animationStage >= 1 ? 'opacity-100' : 'opacity-0'
          }`}>


          {/* Header */}
          <div className="text-center mb-12 mt-8">
            <div className={`flex items-center justify-center gap-3 mb-4 transition-all duration-1000 ${
              animationStage >= 2
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-8'
            }`}>
              <Car className={`h-12 w-12 text-white transition-all duration-1000 delay-300 ${
                animationStage >= 2
                  ? 'opacity-100 rotate-0 scale-100 drop-shadow-lg'
                  : 'opacity-0 -rotate-12 scale-75'
              }`} />
              <h1 className={`text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent transition-all duration-1000 delay-500 ${
                animationStage >= 3
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-8'
              }`}>
                {t('autoria.title') || "Welcome to AutoRia"}
              </h1>
            </div>
            <p className={`text-xl text-slate-200 mb-6 transition-all duration-1000 delay-700 ${
              animationStage >= 4
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}>
              {t('autoria.subtitle') || "Your one-stop platform for buying and selling cars. Find your perfect vehicle or list your car for sale."}
            </p>

            {/* Статистика платформы */}
            <div className={`max-w-2xl mx-auto transition-all duration-1000 delay-1000 ${
              animationStage >= 5
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}>
              <AnimatedPlatformStatsWidget
                showHeader={false}
                animationStage={animationStage}
                showWelcome={showWelcome}
              />
            </div>
          </div>

          {/* Основные функции */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-12">
            {features.map((feature, index) => (
              <Link key={index} href={feature.href} className="group">
                <Card className={`relative h-full bg-gradient-to-br from-white via-slate-50/80 to-white border-0 shadow-lg hover:shadow-2xl transition-all duration-700 group-hover:scale-[1.05] group-hover:-translate-y-2 overflow-hidden ${
                  visibleFeatures.includes(index)
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-12 scale-90'
                } ${
                  glowingFeatures.includes(index)
                    ? `ring-4 ring-opacity-60 shadow-2xl ${
                        feature.color === 'blue' ? 'ring-blue-400 shadow-blue-400/50' :
                        feature.color === 'green' ? 'ring-green-400 shadow-green-400/50' :
                        feature.color === 'purple' ? 'ring-purple-400 shadow-purple-400/50' :
                        feature.color === 'red' ? 'ring-red-400 shadow-red-400/50' :
                        feature.color === 'indigo' ? 'ring-indigo-400 shadow-indigo-400/50' :
                        'ring-slate-400 shadow-slate-400/50'
                      }`
                    : ''
                }`}>
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${
                    feature.color === 'blue' ? 'from-blue-500 to-blue-600' :
                    feature.color === 'green' ? 'from-green-500 to-green-600' :
                    feature.color === 'purple' ? 'from-purple-500 to-purple-600' :
                    feature.color === 'red' ? 'from-red-500 to-red-600' :
                    feature.color === 'indigo' ? 'from-indigo-500 to-indigo-600' :
                    'from-slate-500 to-slate-600'
                  }`} />

                  <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col h-full relative z-10">
                    {/* Icon container */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br shadow-sm group-hover:shadow-md transition-all duration-300 ${
                        feature.color === 'blue' ? 'from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200' :
                        feature.color === 'green' ? 'from-green-50 to-green-100 group-hover:from-green-100 group-hover:to-green-200' :
                        feature.color === 'purple' ? 'from-purple-50 to-purple-100 group-hover:from-purple-100 group-hover:to-purple-200' :
                        feature.color === 'red' ? 'from-red-50 to-red-100 group-hover:from-red-100 group-hover:to-red-200' :
                        feature.color === 'indigo' ? 'from-indigo-50 to-indigo-100 group-hover:from-indigo-100 group-hover:to-indigo-200' :
                        'from-slate-50 to-slate-100 group-hover:from-slate-100 group-hover:to-slate-200'
                      }`}>
                        <div className="group-hover:scale-110 transition-transform duration-300">
                          {feature.icon}
                        </div>
                      </div>
                      {feature.badge && (
                        <div className="absolute top-2 right-2">
                          {feature.badge}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-semibold text-lg text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors flex-1 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    {/* Action indicator */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-medium transition-colors ${
                          feature.color === 'blue' ? 'text-blue-600 group-hover:text-blue-700' :
                          feature.color === 'green' ? 'text-green-600 group-hover:text-green-700' :
                          feature.color === 'purple' ? 'text-purple-600 group-hover:text-purple-700' :
                          feature.color === 'red' ? 'text-red-600 group-hover:text-red-700' :
                          feature.color === 'indigo' ? 'text-indigo-600 group-hover:text-indigo-700' :
                          'text-slate-600 group-hover:text-slate-700'
                        }`}>
                          {t('common.continue') || "Get Started"}
                        </span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                          feature.color === 'blue' ? 'bg-blue-100 group-hover:bg-blue-200' :
                          feature.color === 'green' ? 'bg-green-100 group-hover:bg-green-200' :
                          feature.color === 'purple' ? 'bg-purple-100 group-hover:bg-purple-200' :
                          feature.color === 'red' ? 'bg-red-100 group-hover:bg-red-200' :
                          feature.color === 'indigo' ? 'bg-indigo-100 group-hover:bg-indigo-200' :
                          'bg-slate-100 group-hover:bg-slate-200'
                        }`}>
                          <svg className={`w-3 h-3 transition-colors ${
                            feature.color === 'blue' ? 'text-blue-600' :
                            feature.color === 'green' ? 'text-green-600' :
                            feature.color === 'purple' ? 'text-purple-600' :
                            feature.color === 'red' ? 'text-red-600' :
                            feature.color === 'indigo' ? 'text-indigo-600' :
                            'text-slate-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Преимущества */}
          <Card className={`mb-8 transition-all duration-1000 delay-300 ${
            animationStage >= 7
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}>
            <CardHeader>
              <CardTitle className="text-2xl text-center">{t('autoria.whyChoose') || "Why Choose AutoRia?"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 rounded-full bg-slate-100">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">{t('autoria.benefits.security.title') || "Secure Transactions"}</h3>
                  <p className="text-sm text-slate-600">{t('autoria.benefits.security.description') || "All transactions are protected with advanced security measures"}</p>
                </div>
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 rounded-full bg-slate-100">
                      <Zap className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">{t('autoria.benefits.fast.title') || "Fast & Easy"}</h3>
                  <p className="text-sm text-slate-600">{t('autoria.benefits.fast.description') || "Quick search and easy listing process"}</p>
                </div>
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 rounded-full bg-slate-100">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">{t('autoria.benefits.effective.title') || "Best Prices"}</h3>
                  <p className="text-sm text-slate-600">{t('autoria.benefits.effective.description') || "Competitive pricing and market insights"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Быстрые действия */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/autoria/create-ad">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-5 w-5 mr-2" />
                {t('autoria.createAd') || "Create Ad"}
              </Button>
            </Link>
            <Link href="/autoria/search">
              <Button size="lg" variant="outline">
                <Search className="h-5 w-5 mr-2" />
                {t('searchTitle')}
              </Button>
            </Link>
            <Link href="/autoria">
              <Button size="lg" variant="secondary" className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white">
                <Car className="h-5 w-5 mr-2" />
                Перейти к AutoRia
              </Button>
            </Link>
          </div>
          </div>
        </div>
      </div>
    );
};

export default HomeContent;