/**
 * @fileoverview API routes для управления избранными объявлениями
 *
 * Этот файл содержит endpoints для работы с избранными объявлениями:
 * - POST: Переключение статуса избранного (toggle)
 * - PATCH: Установка конкретного статуса избранного
 *
 * Все методы требуют авторизации пользователя.
 *
 * @author AutoRia Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';

/**
 * @swagger
 * components:
 *   schemas:
 *     FavoriteToggleRequest:
 *       type: object
 *       required:
 *         - car_ad_id
 *       properties:
 *         car_ad_id:
 *           type: integer
 *           description: ID объявления автомобиля
 *           example: 123
 *
 *     FavoriteSetRequest:
 *       type: object
 *       required:
 *         - car_ad_id
 *         - is_favorite
 *       properties:
 *         car_ad_id:
 *           type: integer
 *           description: ID объявления автомобиля
 *           example: 123
 *         is_favorite:
 *           type: boolean
 *           description: Желаемый статус избранного
 *           example: true
 *
 *     FavoriteResponse:
 *       type: object
 *       properties:
 *         is_favorite:
 *           type: boolean
 *           description: Текущий статус избранного
 *           example: true
 *         message:
 *           type: string
 *           description: Сообщение о результате операции
 *           example: "Добавлено в избранное"
 *         car_ad_id:
 *           type: integer
 *           description: ID объявления
 *           example: 123
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Описание ошибки
 *           example: "car_ad_id is required"
 *         details:
 *           type: string
 *           description: Дополнительные детали ошибки
 *           example: "Database connection failed"
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT токен авторизации
 */

/**
 * @swagger
 * /api/autoria/favorites/toggle:
 *   post:
 *     tags:
 *       - Favorites
 *     summary: Переключить статус избранного
 *     description: Переключает статус избранного для объявления (добавляет если не в избранном, удаляет если в избранном)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FavoriteToggleRequest'
 *     responses:
 *       200:
 *         description: Статус избранного успешно изменен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 is_favorite:
 *                   type: boolean
 *                   description: Новый статус избранного
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: Сообщение о результате операции
 *                   example: "Добавлено в избранное"
 *                 car_ad_id:
 *                   type: integer
 *                   description: ID объявления
 *                   example: 123
 *       400:
 *         description: Неверные параметры запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "car_ad_id is required"
 *       401:
 *         description: Пользователь не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 *                 details:
 *                   type: string
 *                   example: "Database connection failed"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { car_ad_id } = body;

    console.log('[Favorites Toggle API] Toggling favorite for car ad:', car_ad_id);

    if (!car_ad_id) {
      return NextResponse.json(
        { error: 'car_ad_id is required' },
        { status: 400 }
      );
    }

    // Формируем URL к backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/ads/favorites/toggle/`;

    // Получаем заголовки авторизации (пользователь определяется по токену)
    const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);
    console.log('[Favorites Toggle API] Using auth headers for user identification', { origin: request.nextUrl.origin });

    // Делаем запрос к backend
    let backendResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ car_ad_id })
    });

    console.log('[Favorites Toggle API] Backend response status:', backendResponse.status);

    // Если 401 — пробуем авто‑рефреш и одну повторную попытку
    if (backendResponse.status === 401) {
      try {
        const origin = request.nextUrl.origin;
        console.log('[Favorites Toggle API] 401 received. Trying refresh via', `${origin}/api/auth/refresh`);
        const refreshResp = await fetch(`${origin}/api/auth/refresh`, { method: 'POST', cache: 'no-store' });
        console.log('[Favorites Toggle API] Refresh response status:', refreshResp.status);

        if (refreshResp.ok) {
          // Берём обновлённые заголовки и повторяем запрос один раз
          const refreshedHeaders = await getAuthorizationHeaders(origin);
          backendResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              ...refreshedHeaders,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ car_ad_id })
          });
          console.log('[Favorites Toggle API] Retry response status:', backendResponse.status);
        }
      } catch (e) {
        console.error('[Favorites Toggle API] Refresh attempt failed:', e);
      }
    }

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Favorites Toggle API] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to toggle favorite', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('[Favorites Toggle API] Successfully toggled favorite:', {
      car_ad_id,
      is_favorite: data.is_favorite
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Favorites Toggle API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/autoria/favorites/toggle:
 *   patch:
 *     tags:
 *       - Favorites
 *     summary: Установить конкретный статус избранного
 *     description: Устанавливает конкретный статус избранного для объявления (true - добавить в избранное, false - удалить из избранного)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - car_ad_id
 *               - is_favorite
 *             properties:
 *               car_ad_id:
 *                 type: integer
 *                 description: ID объявления автомобиля
 *                 example: 123
 *               is_favorite:
 *                 type: boolean
 *                 description: Желаемый статус избранного (true - добавить, false - удалить)
 *                 example: true
 *     responses:
 *       200:
 *         description: Статус избранного успешно установлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 is_favorite:
 *                   type: boolean
 *                   description: Текущий статус избранного
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: Сообщение о результате операции
 *                   example: "Добавлено в избранное"
 *                 car_ad_id:
 *                   type: integer
 *                   description: ID объявления
 *                   example: 123
 *       400:
 *         description: Неверные параметры запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "car_ad_id and is_favorite (boolean) are required"
 *       401:
 *         description: Пользователь не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Доступ запрещен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden"
 *       404:
 *         description: Объявление не найдено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Car ad not found"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 *                 details:
 *                   type: string
 *                   example: "Failed to update favorite status"
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { car_ad_id, is_favorite } = body;

    console.log('[Favorites PATCH API] Setting favorite status:', { car_ad_id, is_favorite });

    if (!car_ad_id || typeof is_favorite !== 'boolean') {
      return NextResponse.json(
        { error: 'car_ad_id and is_favorite (boolean) are required' },
        { status: 400 }
      );
    }

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    console.log('[Favorites PATCH API] Using auth headers for user identification');

    // Сначала проверяем текущий статус
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const checkUrl = `${backendUrl}/api/ads/favorites/check/${car_ad_id}/`;

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: authHeaders
    });

    let currentStatus = false;
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      currentStatus = checkData.is_favorite;
    }

    console.log('[Favorites PATCH API] Current status:', currentStatus, 'Desired status:', is_favorite);

    // Если статус уже соответствует желаемому, возвращаем текущее состояние
    if (currentStatus === is_favorite) {
      return NextResponse.json({
        is_favorite: currentStatus,
        message: is_favorite ? 'Уже в избранном' : 'Уже не в избранном',
        car_ad_id
      });
    }

    // Если статус нужно изменить, используем toggle endpoint
    const toggleUrl = `${backendUrl}/api/ads/favorites/toggle/`;
    const toggleResponse = await fetch(toggleUrl, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ car_ad_id })
    });

    console.log('[Favorites PATCH API] Toggle response status:', toggleResponse.status);

    if (!toggleResponse.ok) {
      const errorText = await toggleResponse.text();
      console.error('[Favorites PATCH API] Toggle error:', errorText);

      return NextResponse.json(
        { error: 'Failed to update favorite status', details: errorText },
        { status: toggleResponse.status }
      );
    }

    const result = await toggleResponse.json();
    console.log('[Favorites PATCH API] Final result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Favorites PATCH API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
