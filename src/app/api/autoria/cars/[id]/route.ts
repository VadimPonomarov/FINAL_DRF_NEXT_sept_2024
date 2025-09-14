import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * Универсальный API route для работы с конкретным объявлением
 * GET /api/autoria/cars/[id] - получить объявление
 * PUT /api/autoria/cars/[id] - обновить объявление  
 * DELETE /api/autoria/cars/[id] - удалить объявление
 */

const getDRFBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
};

async function handleRequest(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const method = req.method;
  
  console.log(`[Car API] 🚀 ${method} request received`);
  
  try {
    const resolvedParams = await params;
    const carId = resolvedParams.id;
    
    console.log(`[Car API] 📋 ${method} /api/autoria/cars/${carId}`);
    console.log(`[Car API] 📍 Request URL:`, req.url);
    
    // Построение URL к DRF API в зависимости от метода
    const baseUrl = getDRFBaseUrl();
    let apiUrl: string;
    
    switch (method) {
      case 'GET':
        apiUrl = `${baseUrl}/api/ads/cars/${carId}`;
        break;
      case 'PUT':
        apiUrl = `${baseUrl}/api/ads/cars/${carId}/update`;
        break;
      case 'DELETE':
        apiUrl = `${baseUrl}/api/ads/cars/${carId}/delete`;
        break;
      default:
        return NextResponse.json(
          { error: `Method ${method} not allowed` },
          { status: 405 }
        );
    }
    
    console.log(`[Car API] 📤 Proxying to: ${apiUrl}`);
    
    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    console.log(`[Car API] 🔐 Auth headers keys:`, Object.keys(authHeaders));
    
    // Подготавливаем заголовки запроса
    const requestHeaders: Record<string, string> = {
      ...authHeaders,
    };
    
    // Подготавливаем тело запроса для PUT
    let body: string | undefined;
    if (method === 'PUT') {
      const formData = await req.json();
      body = JSON.stringify(formData);
      requestHeaders['Content-Type'] = 'application/json';
      
      console.log(`[Car API] 📝 Form data:`, {
        title: formData.title,
        price: formData.price,
        fieldsCount: Object.keys(formData).length
      });
      console.log(`[Car API] 📤 Request body size:`, body.length, 'chars');
    }
    
    // Выполнение запроса к DRF API
    const response = await fetch(apiUrl, {
      method,
      headers: requestHeaders,
      body: body,
      credentials: 'include'
    });
    
    console.log(`[Car API] 📡 DRF response status: ${response.status}`);
    console.log(`[Car API] 📡 DRF response headers:`, Object.fromEntries(response.headers.entries()));
    
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
      console.error(`[Car API] ❌ DRF error:`, response.status, responseData);
      return NextResponse.json(
        { 
          error: `Backend request failed`, 
          details: responseData,
          status: response.status 
        },
        { status: response.status }
      );
    }
    
    console.log(`[Car API] ✅ Success:`, typeof responseData === 'object' ? `Object with ${Object.keys(responseData).length} keys` : 'text response');
    
    // Возвращаем ответ
    if (method === 'DELETE') {
      // DELETE обычно возвращает 204 No Content
      return new NextResponse(null, { status: 204 });
    } else {
      return NextResponse.json(responseData, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
    
  } catch (error) {
    console.error(`[Car API] ❌ Error:`, error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Экспорт обработчиков для всех HTTP методов
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleRequest(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleRequest(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleRequest(req, context);
}

// Конфигурация маршрута
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
