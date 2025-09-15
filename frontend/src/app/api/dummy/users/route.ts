import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Fetching DummyJSON users...');
    const startTime = Date.now();

    const response = await fetch('https://dummyjson.com/users', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DummyJSON API error: ${response.status}`);
    }

    const data = await response.json();
    const endTime = Date.now();

    console.log(`[API] Fetched ${data.users?.length || 0} DummyJSON users in ${endTime - startTime}ms`);

    // Трансформируем данные в формат, совместимый с Backend API
    const transformedData = {
      results: data.users.map((user: any) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        password: user.password,
        first_name: user.firstName,
        last_name: user.lastName,
        is_active: true, // Все DummyJSON пользователи считаются активными
        full_name: `${user.firstName} ${user.lastName}`,
      })),
      count: data.users.length,
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
    });

  } catch (error) {
    console.error('[API] Error fetching DummyJSON users:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch DummyJSON users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
