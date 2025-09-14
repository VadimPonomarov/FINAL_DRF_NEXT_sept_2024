import { NextRequest, NextResponse } from 'next/server';

// Расширенный список нецензурных слов для демонстрации
const PROFANITY_WORDS = [
  // Русский мат
  'блять', 'бля', 'хуй', 'хуя', 'хуе', 'хую', 'хуем', 'хуёв', 'хуевый', 'хуевая', 'хуёвый', 'хуёвая',
  'пизда', 'пизде', 'пизду', 'пиздой', 'пиздец', 'пиздеж', 'пиздить', 'пиздатый', 'пиздатая',
  'ебать', 'ебал', 'ебала', 'ебали', 'ебаный', 'ебаная', 'ебучий', 'ебучая', 'ебануть',
  'сука', 'суки', 'суке', 'суку', 'сукой', 'сучка', 'сучки', 'сучке', 'сучку', 'сучкой',
  'гавно', 'говно', 'говна', 'говне', 'говном', 'дерьмо', 'дерьма', 'дерьме', 'дерьмом',

  // Транслитерация (латиница)
  'blyad', 'blya', 'blyat', 'hui', 'huy', 'huya', 'hue', 'huyu', 'huem', 'huev', 'hueviy', 'huevaya',
  'pizda', 'pizde', 'pizdu', 'pizdoy', 'pizdec', 'pizdezh', 'pizdit', 'pizdatiy', 'pizdataya',
  'ebat', 'ebal', 'ebala', 'ebali', 'ebaniy', 'ebanaya', 'ebuchiy', 'ebuchaya', 'ebanut',
  'yobany', 'yobaniy', 'yobat', 'yobal', 'yobala', 'yobali', 'yobuchiy', 'yobuchaya',
  'suka', 'suki', 'suke', 'suku', 'sukoy', 'suchka', 'suchki', 'suchke', 'suchku', 'suchkoy',
  'nahui', 'nahuy', 'idi', 'poshel', 'mudak', 'kozel', 'debil', 'tvar', 'padla',

  // Вариации с цифрами и символами (leet speak)
  'bl4t', 'bl9t', 'hu1', 'hu!', 'p1zda', 'suk4', 'g0vno', 'der1mo', 'eb4t', 'mud4k',
  'k0zel', 'deb1l', '1d10t', 'tv4r', 'p4dla', 'n4hui', 'p0shel',

  // Украинский мат
  'хуйло', 'пиздець', 'їбати', 'сука', 'блядь', 'курва', 'пизда'
];

// Спам слова
const SPAM_WORDS = [
  'СКИДКА', 'АКЦИЯ', 'ТОЛЬКО СЕГОДНЯ', 'ЗВОНИТЕ СЕЙЧАС', 'НЕ УПУСТИТЕ', 'ЛУЧШИЕ ЦЕНЫ',
  'СУПЕР ПРЕДЛОЖЕНИЕ', 'ОГРАНИЧЕННОЕ ВРЕМЯ', 'БЕСПЛАТНО', 'ДЕШЕВО', 'СРОЧНО'
];

// Неавтомобильные слова
const OFF_TOPIC_WORDS = [
  'квартира', 'дом', 'участок', 'дача', 'комната', 'офис', 'магазин', 'склад',
  'недвижимость', 'аренда квартиры', 'продажа дома', 'земельный участок'
];

interface ValidationRequest {
  title: string;
  description: string;
}

interface ValidationResponse {
  result: 'approved' | 'rejected' | 'needs_review';
  reason: string;
  categories: string[];
  inappropriate_words: string[];
  suggestions: string[];
  confidence: number;
  censored_title: string;
  censored_description: string;
}

function detectProfanity(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  // Проверяем каждое слово из списка
  PROFANITY_WORDS.forEach(badWord => {
    // Создаем регулярное выражение для поиска слова с учетом границ
    const regex = new RegExp(`\\b${badWord}\\b|${badWord}`, 'gi');
    const matches = lowerText.match(regex);

    if (matches) {
      // Добавляем найденные совпадения, сохраняя оригинальный регистр
      matches.forEach(match => {
        // Находим позицию совпадения в оригинальном тексте
        const index = text.toLowerCase().indexOf(match.toLowerCase());
        if (index !== -1) {
          const originalMatch = text.substring(index, index + match.length);
          if (!found.includes(originalMatch.toLowerCase())) {
            found.push(originalMatch.toLowerCase());
          }
        }
      });
    }
  });

  return found;
}

function detectSpam(text: string): boolean {
  const upperText = text.toUpperCase();
  
  // Проверяем на чрезмерное использование заглавных букв
  const capsRatio = (text.match(/[A-ZА-Я]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 20) return true;
  
  // Проверяем на спам слова
  return SPAM_WORDS.some(spamWord => upperText.includes(spamWord));
}

function detectOffTopic(text: string): boolean {
  const lowerText = text.toLowerCase();
  return OFF_TOPIC_WORDS.some(word => lowerText.includes(word));
}

function censorText(text: string, inappropriateWords: string[]): string {
  let censored = text;

  inappropriateWords.forEach(word => {
    // Создаем регулярное выражение для поиска слова (учитываем границы слов)
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b|${escapeRegExp(word)}`, 'gi');

    // Заменяем найденные слова на звездочки
    censored = censored.replace(regex, (match) => {
      return '*'.repeat(match.length);
    });
  });

  return censored;
}

// Вспомогательная функция для экранирования специальных символов в регулярных выражениях
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(request: NextRequest) {
  try {
    console.log('Validation API called');
    const body: ValidationRequest = await request.json();
    console.log('Request body:', body);
    const { title, description } = body;
    
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }
    
    const fullText = `${title} ${description}`;
    
    // Проверяем на нецензурную лексику
    const profanityWords = detectProfanity(fullText);
    const hasProfanity = profanityWords.length > 0;
    
    // Проверяем на спам
    const hasSpam = detectSpam(fullText);
    
    // Проверяем на соответствие тематике
    const isOffTopic = detectOffTopic(fullText);
    
    // Определяем результат
    let result: 'approved' | 'rejected' | 'needs_review' = 'approved';
    let reason = 'Контент соответствует всем требованиям';
    let categories: string[] = [];
    let suggestions: string[] = [];
    let confidence = 0.98;
    
    if (hasProfanity) {
      result = 'rejected';
      reason = 'Обнаружена нецензурная лексика в тексте объявления';
      categories.push('profanity', 'inappropriate_language');
      suggestions.push(
        'Удалите нецензурную лексику из заголовка и описания',
        'Используйте вежливые формулировки',
        'Опишите преимущества автомобиля'
      );
      confidence = 0.95;
    } else if (hasSpam) {
      result = 'rejected';
      reason = 'Обнаружены признаки спама и агрессивной рекламы';
      categories.push('spam', 'excessive_caps', 'aggressive_marketing');
      suggestions.push(
        'Уберите чрезмерное использование заглавных букв',
        'Удалите агрессивные рекламные призывы',
        'Опишите автомобиль в спокойном тоне'
      );
      confidence = 0.89;
    } else if (isOffTopic) {
      result = 'rejected';
      reason = 'Контент не относится к продаже автомобилей';
      categories.push('off_topic', 'wrong_category');
      suggestions.push(
        'Используйте платформу для размещения автомобильных объявлений',
        'Опишите характеристики автомобиля',
        'Укажите марку, модель и год выпуска'
      );
      confidence = 0.92;
    } else {
      suggestions.push(
        'Отличное объявление!',
        'Добавьте больше фотографий для привлечения покупателей'
      );
    }
    
    const response: ValidationResponse = {
      result,
      reason,
      categories,
      inappropriate_words: profanityWords,
      suggestions,
      confidence,
      censored_title: censorText(title, profanityWords),
      censored_description: censorText(description, profanityWords)
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
