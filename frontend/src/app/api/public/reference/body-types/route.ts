import { NextRequest, NextResponse } from 'next/server';

// Статические данные для типов кузова
const BODY_TYPES = [
  { id: 'SEDAN', name: 'Седан' },
  { id: 'HATCHBACK', name: 'Хэтчбек' },
  { id: 'WAGON', name: 'Универсал' },
  { id: 'SUV', name: 'Внедорожник' },
  { id: 'COUPE', name: 'Купе' },
  { id: 'CONVERTIBLE', name: 'Кабриолет' },
  { id: 'PICKUP', name: 'Пикап' },
  { id: 'VAN', name: 'Фургон' },
  { id: 'MINIVAN', name: 'Минивэн' },
  { id: 'CROSSOVER', name: 'Кроссовер' },
  { id: 'LIMOUSINE', name: 'Лимузин' },
  { id: 'OTHER', name: 'Другое' }
];

export async function GET(request: NextRequest) {
  console.log('[Body Types API] 🚗 GET request received!');
  const searchParams = new URL(request.url).searchParams;
  const pageSize = parseInt(searchParams.get('page_size') || '50', 10);

  console.log(`[Body Types API] Returning ${BODY_TYPES.length} body types (page_size: ${pageSize})`);

  return NextResponse.json({
    results: BODY_TYPES.slice(0, pageSize),
    count: BODY_TYPES.length,
    next: null,
    previous: null
  });
}

