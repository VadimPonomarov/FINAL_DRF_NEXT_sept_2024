import { NextRequest, NextResponse } from 'next/server';

/**
 * API для получения пользователей AutoRia с информацией об аккаунтах
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[AutoRia Users API] 👥 Getting AutoRia users...');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Получаем пользователей через публичный endpoint (без аутентификации)
    const usersResponse = await fetch(`${backendUrl}/api/users/public/list/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!usersResponse.ok) {
      const errorText = await usersResponse.text();
      console.error('[AutoRia Users API] ❌ Backend error:', {
        status: usersResponse.status,
        statusText: usersResponse.statusText,
        error: errorText
      });

      return NextResponse.json({
        success: false,
        error: `Backend error: ${usersResponse.status} - ${usersResponse.statusText}`,
        details: errorText,
        message: 'Не удалось получить пользователей из базы данных'
      }, { status: usersResponse.status });
    }

    const usersData = await usersResponse.json();
    console.log('[AutoRia Users API] ✅ Got users from backend:', usersData.count || 0);

    // Проверяем, что данные корректны
    if (!usersData || (!usersData.results && !Array.isArray(usersData))) {
      console.error('[AutoRia Users API] ❌ Invalid data structure from backend:', usersData);
      return NextResponse.json({
        success: false,
        error: 'Invalid data structure from backend',
        message: 'Некорректная структура данных от бэкенда'
      }, { status: 500 });
    }

    // Получаем массив пользователей (поддерживаем разные форматы ответа)
    const allUsers = usersData.results || usersData || [];

    // Фильтруем только активных пользователей
    const activeUsers = allUsers.filter((user: any) => user.is_active);

    console.log('[AutoRia Users API] ✅ Processed users:', {
      total: allUsers.length,
      active: activeUsers.length,
      sample: activeUsers.slice(0, 3).map((u: any) => ({ id: u.id, email: u.email, is_superuser: u.is_superuser }))
    });

    return NextResponse.json({
      success: true,
      data: {
        results: activeUsers,
        count: activeUsers.length
      },
      source: 'backend',
      message: `Получено ${activeUsers.length} активных пользователей из базы данных`
    });

  } catch (error) {
    console.error('[AutoRia Users API] ❌ Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Ошибка получения пользователей'
    }, { status: 500 });
  }
}

