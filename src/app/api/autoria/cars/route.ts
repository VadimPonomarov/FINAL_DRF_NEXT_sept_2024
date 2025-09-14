import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * API route для работы со списком объявлений
 * GET /api/autoria/cars - получить список объявлений
 * POST /api/autoria/cars - создать новое объявление
 */

const getDRFBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
};

async function handleRequest(req: NextRequest) {
  const method = req.method;
  
  console.log(`[Cars API] 🚀 ${method} request received`);
  
  try {
    console.log(`[Cars API] 📋 ${method} /api/autoria/cars`);
    console.log(`[Cars API] 📍 Request URL:`, req.url);
    
    // Построение URL к DRF API
    const baseUrl = getDRFBaseUrl();
    let apiUrl: string;
    
    switch (method) {
      case 'GET':
        apiUrl = `${baseUrl}/api/ads/cars`;
        break;
      case 'POST':
        apiUrl = `${baseUrl}/api/ads/cars/create/`;
        break;
      default:
        return NextResponse.json(
          { error: `Method ${method} not allowed` },
          { status: 405 }
        );
    }
    
    console.log(`[Cars API] 📤 Proxying to: ${apiUrl}`);
    
    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    console.log(`[Cars API] 🔐 Auth headers keys:`, Object.keys(authHeaders));
    
    // Подготавливаем заголовки запроса
    const requestHeaders: Record<string, string> = {
      ...authHeaders,
    };
    
    // Подготавливаем тело запроса для POST
    let body: string | undefined;
    if (method === 'POST') {
      const formData = await req.json();
      body = JSON.stringify(formData);
      requestHeaders['Content-Type'] = 'application/json';
      
      console.log(`[Cars API] 📝 Form data:`, {
        title: formData.title,
        price: formData.price,
        fieldsCount: Object.keys(formData).length
      });
      console.log(`[Cars API] 📤 Request body size:`, body.length, 'chars');
    }
    
    // Добавляем query параметры для GET запросов
    let finalUrl = apiUrl;
    if (method === 'GET') {
      const { searchParams } = new URL(req.url);
      if (searchParams.toString()) {
        finalUrl += `?${searchParams.toString()}`;
        console.log(`[Cars API] 🔍 Query params:`, searchParams.toString());
      }
    }
    
    // Выполнение запроса к DRF API
    const response = await fetch(finalUrl, {
      method,
      headers: requestHeaders,
      body: body,
      credentials: 'include'
    });
    
    console.log(`[Cars API] 📡 DRF response status: ${response.status}`);
    
    // Получение ответа
    const contentType = response.headers.get('content-type');
    let responseData: any;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    // Логирование ошибок
    if (!response.ok) {
      console.error(`[Cars API] ❌ DRF error:`, response.status, responseData);
      return NextResponse.json(
        { 
          error: 'Backend request failed', 
          details: responseData,
          status: response.status 
        },
        { status: response.status }
      );
    }
    
    console.log(`[Cars API] ✅ Success:`, typeof responseData === 'object' ? `Object with ${Object.keys(responseData).length} keys` : 'text response');
    
    // Возвращаем ответ
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
  } catch (error) {
    console.error(`[Cars API] ❌ Error:`, error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Экспорт обработчиков для HTTP методов
export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

// Конфигурация маршрута
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
