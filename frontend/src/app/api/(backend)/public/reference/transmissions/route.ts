import { NextRequest, NextResponse } from 'next/server';

// Статические данные для типов трансмиссии
const TRANSMISSIONS = [
  { id: 'MANUAL', name: 'Механическая' },
  { id: 'AUTOMATIC', name: 'Автоматическая' },
  { id: 'CVT', name: 'Вариатор' },
  { id: 'ROBOT', name: 'Робот' },
  { id: 'OTHER', name: 'Другое' }
];

export async function GET(request: NextRequest) {
  console.log('[Transmissions API] ⚙️ GET request received!');
  const searchParams = new URL(request.url).searchParams;
  const pageSize = parseInt(searchParams.get('page_size') || '50', 10);

  console.log(`[Transmissions API] Returning ${TRANSMISSIONS.length} transmissions (page_size: ${pageSize})`);

  return NextResponse.json({
    results: TRANSMISSIONS.slice(0, pageSize),
    count: TRANSMISSIONS.length,
    next: null,
    previous: null
  });
}

