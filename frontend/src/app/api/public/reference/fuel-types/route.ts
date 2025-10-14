import { NextRequest, NextResponse } from 'next/server';

// Статические данные для типов топлива
const FUEL_TYPES = [
  { id: 'PETROL', name: 'Бензин' },
  { id: 'DIESEL', name: 'Дизель' },
  { id: 'HYBRID', name: 'Гибрид' },
  { id: 'ELECTRIC', name: 'Электро' },
  { id: 'GAS', name: 'Газ' },
  { id: 'OTHER', name: 'Другое' }
];

export async function GET(request: NextRequest) {
  console.log('[Fuel Types API] 🔥 GET request received!');
  const searchParams = new URL(request.url).searchParams;
  const pageSize = parseInt(searchParams.get('page_size') || '50', 10);

  console.log(`[Fuel Types API] Returning ${FUEL_TYPES.length} fuel types (page_size: ${pageSize})`);

  return NextResponse.json({
    results: FUEL_TYPES.slice(0, pageSize),
    count: FUEL_TYPES.length,
    next: null,
    previous: null
  });
}

