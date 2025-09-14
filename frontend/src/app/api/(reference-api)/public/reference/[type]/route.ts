import { NextRequest, NextResponse } from 'next/server';

// Статические данные для справочников
const REFERENCE_DATA = {
  'fuel-types': [
    { id: 'PETROL', name: 'Бензин' },
    { id: 'DIESEL', name: 'Дизель' },
    { id: 'HYBRID', name: 'Гибрид' },
    { id: 'ELECTRIC', name: 'Электро' },
    { id: 'GAS', name: 'Газ' },
    { id: 'OTHER', name: 'Другое' }
  ],
  'transmissions': [
    { id: 'MANUAL', name: 'Механическая' },
    { id: 'AUTOMATIC', name: 'Автоматическая' },
    { id: 'CVT', name: 'Вариатор' },
    { id: 'ROBOT', name: 'Робот' },
    { id: 'OTHER', name: 'Другое' }
  ],
  'body-types': [
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
  ]
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const searchParams = new URL(request.url).searchParams;
  const pageSize = parseInt(searchParams.get('page_size') || '50', 10);

  // Проверяем, что тип справочника существует
  if (!REFERENCE_DATA[type as keyof typeof REFERENCE_DATA]) {
    return NextResponse.json(
      { error: `Reference type '${type}' not found` },
      { status: 404 }
    );
  }

  const data = REFERENCE_DATA[type as keyof typeof REFERENCE_DATA];
  const limitedData = data.slice(0, pageSize);

  return NextResponse.json({
    options: limitedData,
    count: limitedData.length,
    total: data.length
  });
}
