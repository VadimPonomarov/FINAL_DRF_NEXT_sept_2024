import { NextRequest, NextResponse } from 'next/server';

interface ModerationRequest {
  title: string;
  description: string;
}

interface ModerationResponse {
  result: 'approved' | 'rejected' | 'needs_review';
  original_title: string;
  original_description: string;
  censored_title: string;
  censored_description: string;
  reason: string;
  inappropriate_words: string[];
  suggestions: string[];
  categories: string[];
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ModerationRequest = await request.json();
    
    if (!body.title || !body.description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Улучшенная проверка контента с поддержкой транслитерации
    const fullText = (body.title + ' ' + body.description).toLowerCase();
    const inappropriateWords = [];

    // Расширенный список нецензурных слов
    const badWords = [
      // Кириллица
      'блять', 'бля', 'хуй', 'хуя', 'хуе', 'хую', 'хуем', 'хуёв', 'хуевый', 'хуевая',
      'пизда', 'пизде', 'пизду', 'пиздой', 'пиздец', 'пиздеж', 'пиздить', 'пиздатый',
      'ебать', 'ебал', 'ебала', 'ебали', 'ебаный', 'ебаная', 'ебучий', 'ебучая',
      'сука', 'суки', 'суке', 'суку', 'сукой', 'сучка', 'сучки', 'дебил', 'мудак',
      'говно', 'говна', 'говне', 'говном', 'дерьмо', 'дерьма', 'дерьме',

      // Транслитерация
      'blyat', 'blya', 'blyad', 'hui', 'huy', 'huya', 'hue', 'huyu', 'huem', 'huev',
      'pizda', 'pizde', 'pizdu', 'pizdoy', 'pizdec', 'pizdezh', 'pizdit', 'pizdatiy',
      'ebat', 'ebal', 'ebala', 'ebali', 'ebaniy', 'ebanaya', 'ebuchiy', 'ebuchaya',
      'yobany', 'yobaniy', 'yobat', 'yobal', 'yobala', 'yobali', 'yobuchiy',
      'suka', 'suki', 'suke', 'suku', 'sukoy', 'suchka', 'suchki', 'debil', 'mudak',
      'nahui', 'nahuy', 'idi', 'poshel', 'govno', 'derimo', 'kozel', 'tvar', 'padla',

      // Leet speak
      'bl4t', 'bl9t', 'hu1', 'hu!', 'p1zda', 'suk4', 'g0vno', 'der1mo',
      'eb4t', 'mud4k', 'k0zel', 'deb1l', '1d10t', 'tv4r', 'p4dla', 'n4hui'
    ];

    // Проверяем каждое слово с учетом границ слов
    for (const badWord of badWords) {
      const regex = new RegExp(`\\b${badWord}\\b|${badWord}`, 'gi');
      if (regex.test(fullText)) {
        inappropriateWords.push(badWord);
      }
    }

    // Проверяем на нетематический контент
    const offTopicWords = ['квартира', 'дом', 'участок', 'телефон', 'компьютер'];
    let isOffTopic = false;
    for (let i = 0; i < offTopicWords.length; i++) {
      const word = offTopicWords[i];
      if (fullText.indexOf(word) !== -1) {
        isOffTopic = true;
        break;
      }
    }
    
    // Определяем результат
    let result: 'approved' | 'rejected' | 'needs_review' = 'approved';
    let reason = 'Контент соответствует всем требованиям';
    let categories: string[] = [];
    let suggestions: string[] = [];
    
    if (inappropriateWords.length > 0) {
      result = 'rejected';
      reason = 'Обнаружена нецензурная лексика';
      categories.push('profanity');
      suggestions.push('Удалите нецензурную лексику из текста');
      suggestions.push('Используйте вежливые формулировки');
    } else if (isOffTopic) {
      result = 'rejected';
      reason = 'Контент не относится к продаже автомобилей';
      categories.push('off_topic');
      suggestions.push('Опишите характеристики автомобиля');
      suggestions.push('Укажите марку, модель и год выпуска');
    } else {
      suggestions.push('Отличное объявление!');
      suggestions.push('Добавьте больше фотографий для привлечения покупателей');
    }
    
    // Цензурируем текст
    let censoredTitle = body.title;
    let censoredDescription = body.description;
    
    for (const word of inappropriateWords) {
      const replacement = '*'.repeat(word.length);
      const regex = new RegExp(word, 'gi');
      censoredTitle = censoredTitle.replace(regex, replacement);
      censoredDescription = censoredDescription.replace(regex, replacement);
    }
    
    const response: ModerationResponse = {
      result,
      original_title: body.title,
      original_description: body.description,
      censored_title: censoredTitle,
      censored_description: censoredDescription,
      reason,
      inappropriate_words: inappropriateWords,
      suggestions,
      categories,
      confidence: inappropriateWords.length > 0 ? 0.95 : 0.98
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Moderation check error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
