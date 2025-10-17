import { NextRequest, NextResponse } from 'next/server';

/**
 * Универсальный API эндпоинт для публичных reference данных
 * Возвращает моковые данные для всех типов reference данных
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    const { searchParams } = new URL(request.url);

    console.log(`📋 PUBLIC REFERENCE API: GET request for type: ${type}`);

    // Получаем параметры пагинации
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');

    // Моковые данные для разных типов
    let data: any[] = [];
    let totalCount = 0;

    switch (type) {
      case 'vehicle-types':
        data = [
          { id: 1, name: 'Легковой автомобиль', code: 'car' },
          { id: 2, name: 'Внедорожник', code: 'suv' },
          { id: 3, name: 'Микроавтобус', code: 'minivan' },
          { id: 4, name: 'Грузовой автомобиль', code: 'truck' },
          { id: 5, name: 'Мотоцикл', code: 'motorcycle' },
          { id: 6, name: 'Автобус', code: 'bus' },
          { id: 7, name: 'Специальная техника', code: 'special' }
        ];
        totalCount = 7;
        break;

      case 'regions':
        data = [
          { id: 1, name: 'Київська область', code: 'kyiv_region' },
          { id: 2, name: 'Одеська область', code: 'odesa_region' },
          { id: 3, name: 'Львівська область', code: 'lviv_region' },
          { id: 4, name: 'Харківська область', code: 'kharkiv_region' },
          { id: 5, name: 'Дніпропетровська область', code: 'dnipro_region' },
          { id: 6, name: 'Запорізька область', code: 'zaporizhzhia_region' },
          { id: 7, name: 'Вінницька область', code: 'vinnytsia_region' },
          { id: 8, name: 'Полтавська область', code: 'poltava_region' },
          { id: 9, name: 'Черкаська область', code: 'cherkasy_region' },
          { id: 10, name: 'Сумська область', code: 'sumy_region' }
        ];
        totalCount = 25;
        break;

      case 'colors':
        data = [
          { id: 1, name: 'Белый', code: 'white', hex: '#FFFFFF' },
          { id: 2, name: 'Черный', code: 'black', hex: '#000000' },
          { id: 3, name: 'Серый', code: 'gray', hex: '#808080' },
          { id: 4, name: 'Серебристый', code: 'silver', hex: '#C0C0C0' },
          { id: 5, name: 'Красный', code: 'red', hex: '#FF0000' },
          { id: 6, name: 'Синий', code: 'blue', hex: '#0000FF' },
          { id: 7, name: 'Зеленый', code: 'green', hex: '#008000' },
          { id: 8, name: 'Желтый', code: 'yellow', hex: '#FFFF00' },
          { id: 9, name: 'Оранжевый', code: 'orange', hex: '#FFA500' },
          { id: 10, name: 'Коричневый', code: 'brown', hex: '#A52A2A' },
          { id: 11, name: 'Фиолетовый', code: 'purple', hex: '#800080' },
          { id: 12, name: 'Бежевый', code: 'beige', hex: '#F5F5DC' },
          { id: 13, name: 'Бордовый', code: 'burgundy', hex: '#800020' },
          { id: 14, name: 'Золотистый', code: 'gold', hex: '#FFD700' },
          { id: 15, name: 'Бронзовый', code: 'bronze', hex: '#CD7F32' }
        ];
        totalCount = 15;
        break;

      case 'cities':
        // Фильтрация по региону (если указан)
        const cityRegionId = searchParams.get('region_id');
        const allCities = [
          // Київська область
          { id: 1, name: 'Київ', code: 'kyiv', region_id: 1 },
          { id: 2, name: 'Бровари', code: 'brovary', region_id: 1 },
          { id: 3, name: 'Біла Церква', code: 'bila_tserkva', region_id: 1 },
          // Одеська область
          { id: 4, name: 'Одеса', code: 'odesa', region_id: 2 },
          { id: 5, name: 'Ізмаїл', code: 'izmail', region_id: 2 },
          // Львівська область
          { id: 6, name: 'Львів', code: 'lviv', region_id: 3 },
          { id: 7, name: 'Дрогобич', code: 'drohobych', region_id: 3 },
          // Харківська область
          { id: 8, name: 'Харків', code: 'kharkiv', region_id: 4 },
          { id: 9, name: 'Лозова', code: 'lozova', region_id: 4 },
          // Дніпропетровська область
          { id: 10, name: 'Дніпро', code: 'dnipro', region_id: 5 },
          { id: 11, name: 'Кривий Ріг', code: 'kryvyi_rih', region_id: 5 },
          // Запорізька область
          { id: 12, name: 'Запоріжжя', code: 'zaporizhzhia', region_id: 6 },
          { id: 13, name: 'Мелітополь', code: 'melitopol', region_id: 6 },
          // Вінницька область
          { id: 14, name: 'Вінниця', code: 'vinnytsia', region_id: 7 },
          { id: 15, name: 'Хмільник', code: 'khmilnyk', region_id: 7 },
          // Полтавська область
          { id: 16, name: 'Полтава', code: 'poltava', region_id: 8 },
          { id: 17, name: 'Кременчук', code: 'kremenchuk', region_id: 8 },
          // Черкаська область
          { id: 18, name: 'Черкаси', code: 'cherkasy', region_id: 9 },
          { id: 19, name: 'Умань', code: 'uman', region_id: 9 },
          // Сумська область
          { id: 20, name: 'Суми', code: 'sumy', region_id: 10 },
          { id: 21, name: 'Конотоп', code: 'konotop', region_id: 10 }
        ];

        if (cityRegionId) {
          data = allCities.filter(city => String(city.region_id) === cityRegionId);
        } else {
          data = allCities;
        }
        totalCount = data.length;
        break;

      case 'brands':
        // Фильтрация по типу транспорта (если указан)
        const vehicleTypeId = searchParams.get('vehicle_type_id');
        data = [
          { id: 1, name: 'BMW', code: 'bmw', country: 'Germany', vehicle_type_id: 1 },
          { id: 2, name: 'Mercedes-Benz', code: 'mercedes', country: 'Germany', vehicle_type_id: 1 },
          { id: 3, name: 'Audi', code: 'audi', country: 'Germany', vehicle_type_id: 1 },
          { id: 4, name: 'Volkswagen', code: 'volkswagen', country: 'Germany', vehicle_type_id: 1 },
          { id: 5, name: 'Toyota', code: 'toyota', country: 'Japan', vehicle_type_id: 1 },
          { id: 6, name: 'Honda', code: 'honda', country: 'Japan', vehicle_type_id: 1 },
          { id: 7, name: 'Nissan', code: 'nissan', country: 'Japan', vehicle_type_id: 1 },
          { id: 8, name: 'Ford', code: 'ford', country: 'USA', vehicle_type_id: 1 },
          { id: 9, name: 'Chevrolet', code: 'chevrolet', country: 'USA', vehicle_type_id: 1 },
          { id: 10, name: 'Hyundai', code: 'hyundai', country: 'South Korea', vehicle_type_id: 1 },
          { id: 11, name: 'Kia', code: 'kia', country: 'South Korea', vehicle_type_id: 1 },
          { id: 12, name: 'Renault', code: 'renault', country: 'France', vehicle_type_id: 1 },
          { id: 13, name: 'Peugeot', code: 'peugeot', country: 'France', vehicle_type_id: 1 },
          { id: 14, name: 'Fiat', code: 'fiat', country: 'Italy', vehicle_type_id: 1 },
          { id: 15, name: 'Alfa Romeo', code: 'alfa_romeo', country: 'Italy', vehicle_type_id: 1 }
        ];
        // Фильтруем по типу транспорта если указан
        if (vehicleTypeId) {
          data = data.filter(item => String(item.vehicle_type_id) === vehicleTypeId);
        }
        totalCount = data.length;
        break;

      case 'models':
        // Фильтрация по марке (обязательно)
        const brandId = searchParams.get('brand_id');
        if (!brandId) {
          data = [];
          totalCount = 0;
        } else {
          // Моковые модели для разных марок
          const allModels = [
            // BMW models
            { id: 1, name: 'X5', code: 'x5', brand_id: 1 },
            { id: 2, name: 'X3', code: 'x3', brand_id: 1 },
            { id: 3, name: '3 Series', code: '3_series', brand_id: 1 },
            { id: 4, name: '5 Series', code: '5_series', brand_id: 1 },
            // Mercedes models
            { id: 5, name: 'C-Class', code: 'c_class', brand_id: 2 },
            { id: 6, name: 'E-Class', code: 'e_class', brand_id: 2 },
            { id: 7, name: 'GLE', code: 'gle', brand_id: 2 },
            // Audi models
            { id: 8, name: 'A4', code: 'a4', brand_id: 3 },
            { id: 9, name: 'A6', code: 'a6', brand_id: 3 },
            { id: 10, name: 'Q5', code: 'q5', brand_id: 3 },
            // Toyota models
            { id: 11, name: 'Camry', code: 'camry', brand_id: 5 },
            { id: 12, name: 'Corolla', code: 'corolla', brand_id: 5 },
            { id: 13, name: 'RAV4', code: 'rav4', brand_id: 5 },
          ];
          data = allModels.filter(model => String(model.brand_id) === brandId);
          totalCount = data.length;
        }
        break;

      case 'fuel-types':
        data = [
          { id: 1, name: 'Бензин', code: 'gasoline' },
          { id: 2, name: 'Дизель', code: 'diesel' },
          { id: 3, name: 'Газ', code: 'gas' },
          { id: 4, name: 'Электро', code: 'electric' },
          { id: 5, name: 'Гибрид', code: 'hybrid' },
          { id: 6, name: 'Газ/Бензин', code: 'gas_gasoline' }
        ];
        totalCount = 6;
        break;

      case 'transmissions':
        data = [
          { id: 1, name: 'Механическая', code: 'manual' },
          { id: 2, name: 'Автоматическая', code: 'automatic' },
          { id: 3, name: 'Роботизированная', code: 'robotized' },
          { id: 4, name: 'Вариатор', code: 'cvt' }
        ];
        totalCount = 4;
        break;

      case 'body-types':
        data = [
          { id: 1, name: 'Седан', code: 'sedan' },
          { id: 2, name: 'Хэтчбек', code: 'hatchback' },
          { id: 3, name: 'Универсал', code: 'wagon' },
          { id: 4, name: 'Купе', code: 'coupe' },
          { id: 5, name: 'Кабриолет', code: 'convertible' },
          { id: 6, name: 'Внедорожник', code: 'suv' },
          { id: 7, name: 'Кроссовер', code: 'crossover' },
          { id: 8, name: 'Минивэн', code: 'minivan' },
          { id: 9, name: 'Пикап', code: 'pickup' }
        ];
        totalCount = 9;
        break;

      default:
        console.warn(`⚠️ PUBLIC REFERENCE API: Unknown type: ${type}`);
        data = [];
        totalCount = 0;
    }

    // Применяем пагинацию
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    // Трансформируем данные в формат {value, label} для VirtualSelect
    const options = paginatedData.map(item => ({
      value: String(item.id),
      label: item.name
    }));

    // Формируем ответ в формате DRF с дополнительным полем options
    const response = {
      success: true,
      data: paginatedData,
      options: options, // Добавляем для VirtualSelect
      pagination: {
        count: totalCount,
        page: page,
        page_size: pageSize,
        total_pages: Math.ceil(totalCount / pageSize),
        has_next: endIndex < totalCount,
        has_previous: page > 1,
        next: page < Math.ceil(totalCount / pageSize) ? page + 1 : null,
        previous: page > 1 ? page - 1 : null
      }
    };

    console.log(`✅ PUBLIC REFERENCE API: Returning ${paginatedData.length} items (${options.length} options) for type: ${type}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ PUBLIC REFERENCE API: Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}