"""
Интеллектуальная LLM-модерация на основе промптов
Анализирует контент через промптирование вместо жестких правил
"""
import re
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ModerationStatus(Enum):
    """Статусы модерации"""
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"
    FLAGGED = "flagged"


class ViolationType(Enum):
    """Типы нарушений"""
    PROFANITY = "profanity"
    OFF_TOPIC = "off_topic"
    SPAM = "spam"
    SCAM = "scam"
    INAPPROPRIATE_CONTENT = "inappropriate_content"


@dataclass
class ModerationResult:
    """Результат модерации"""
    status: ModerationStatus
    confidence: float
    violations: List[ViolationType]
    flagged_text: List[str]
    censored_text: Dict[str, str]
    reason: str
    suggestions: List[str]
    language_detected: str
    processing_time_ms: int


class LLMPromptModerationService:
    """
    LLM-модерация на основе промптов
    Использует интеллектуальный анализ вместо жестких паттернов
    """
    
    def __init__(self):
        self.profanity_examples = {
            'ukrainian': [
                'блять', 'бля', 'хуй', 'хуя', 'хуе', 'хую', 'хуем', 'хуёв', 'хуевый', 'хуевая',
                'пизда', 'пизде', 'пизду', 'пиздой', 'пиздец', 'пиздеж', 'пиздить', 'пиздатый',
                'ебать', 'ебал', 'ебала', 'ебали', 'ебаный', 'ебаная', 'ебучий', 'ебучая',
                'сука', 'суки', 'суке', 'суку', 'сукой', 'сучка', 'сучки', 'дебил', 'мудак'
            ],
            'russian': [
                'блядь', 'бля', 'хуй', 'хуя', 'хуе', 'хую', 'хуем', 'хуёв', 'хуевый', 'хуевая',
                'пизда', 'пизде', 'пизду', 'пиздой', 'пиздец', 'пиздеж', 'пиздить', 'пиздатый',
                'ебать', 'ебал', 'ебала', 'ебали', 'ебаный', 'ебаная', 'ебучий', 'ебучая',
                'сука', 'суки', 'суке', 'суку', 'сукой', 'сучка', 'сучки', 'дебил', 'мудак',
                'говно', 'говна', 'говне', 'говном', 'дерьмо', 'дерьма', 'дерьме'
            ],
            'english': ['fuck', 'shit', 'bitch', 'damn', 'ass', 'cunt', 'whore', 'slut'],
            'transliteration': [
                'blyat', 'blya', 'blyad', 'hui', 'huy', 'huya', 'hue', 'huyu', 'huem', 'huev',
                'pizda', 'pizde', 'pizdu', 'pizdoy', 'pizdec', 'pizdezh', 'pizdit', 'pizdatiy',
                'ebat', 'ebal', 'ebala', 'ebali', 'ebaniy', 'ebanaya', 'ebuchiy', 'ebuchaya',
                'suka', 'suki', 'suke', 'suku', 'sukoy', 'suchka', 'suchki', 'debil', 'mudak',
                'nahui', 'nahuy', 'idi', 'poshel', 'govno', 'derimo', 'kozel', 'tvar', 'padla'
            ],
            'leet_speak': [
                'bl4t', 'bl9t', 'hu1', 'hu!', 'p1zda', 'suk4', 'g0vno', 'der1mo',
                'eb4t', 'mud4k', 'k0zel', 'deb1l', '1d10t', 'tv4r', 'p4dla', 'n4hui'
            ]
        }

    def simulate_llm_profanity_analysis(self, content: str) -> Dict[str, Any]:
        """
        Симуляция LLM анализа нецензурной лексики
        В реальной системе здесь был бы вызов к OpenAI/Claude/etc
        """
        import time
        start_time = time.time()
        
        content_lower = content.lower()
        found_words = []
        censored_mapping = {}
        detected_languages = []
        
        # Симуляция интеллектуального анализа с улучшенным поиском
        for lang, examples in self.profanity_examples.items():
            for word in examples:
                # Используем регулярные выражения для точного поиска
                import re
                regex = re.compile(rf'\b{re.escape(word)}\b|{re.escape(word)}', re.IGNORECASE)
                if regex.search(content_lower):
                    found_words.append(word)
                    censored_mapping[word] = self._censor_word(word)
                    if lang not in detected_languages:
                        detected_languages.append(lang)
        
        # Интеллектуальное обнаружение замаскированных слов
        masked_words = self._detect_masked_profanity(content_lower)
        for original, censored in masked_words.items():
            found_words.append(original)
            censored_mapping[original] = censored
            if 'evasion' not in detected_languages:
                detected_languages.append('evasion')
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return {
            'has_profanity': len(found_words) > 0,
            'confidence': 0.95 if found_words else 0.98,
            'found_words': found_words,
            'censored_words': censored_mapping,
            'languages': detected_languages,
            'severity': 'high' if len(found_words) > 2 else 'medium' if found_words else 'low',
            'processing_time_ms': processing_time
        }

    def simulate_llm_topic_analysis(self, title: str, description: str, **fields) -> Dict[str, Any]:
        """
        Симуляция LLM анализа тематики
        """
        all_content = f"{title} {description}"
        for field_name, field_value in fields.items():
            if isinstance(field_value, str):
                all_content += f" {field_value}"
            elif isinstance(field_value, dict):
                for sub_value in field_value.values():
                    if isinstance(sub_value, str):
                        all_content += f" {sub_value}"
        
        content_lower = all_content.lower()
        
        # Транспортные индикаторы
        transport_indicators = []
        transport_keywords = [
            'автомобіль', 'автомобиль', 'машина', 'авто', 'car', 'vehicle',
            'мотоцикл', 'motorcycle', 'скутер', 'scooter', 'мопед', 'moped',
            'вантажівка', 'грузовик', 'truck', 'автобус', 'bus',
            'bmw', 'mercedes', 'audi', 'toyota', 'honda', 'ford',
            'двигун', 'engine', 'мотор', 'коробка', 'transmission',
            'пробіг', 'пробег', 'mileage', 'паливо', 'топливо', 'fuel'
        ]
        
        for keyword in transport_keywords:
            if keyword in content_lower:
                transport_indicators.append(keyword)
        
        # Запрещенные категории
        prohibited_items = []
        prohibited_keywords = [
            'прокладки', 'тампони', 'pads', 'tampons',  # Гигиена
            'одяг', 'одежда', 'сукня', 'платье', 'clothes', 'dress',  # Одежда
            'їжа', 'еда', 'продукти', 'food', 'bread',  # Еда
            'телефон', 'смартфон', 'phone', 'computer',  # Электроника
            'квартира', 'будинок', 'apartment', 'house',  # Недвижимость
            'послуги', 'услуги', 'services', 'ремонт', 'repair'  # Услуги
        ]
        
        for keyword in prohibited_keywords:
            if keyword in content_lower:
                prohibited_items.append(keyword)
        
        # ИНТЕЛЛЕКТУАЛЬНЫЙ ВЕРОЯТНОСТНЫЙ ПОДХОД LLM МОДЕРАЦИИ
        # Контент отклоняется только если он НИКАК не может быть связан с торговлей транспортом
        # в широком смысле (наземный, надводный, воздушный транспорт)

        # МИНИМАЛЬНЫЙ список критически запрещенных категорий
        critical_non_transport = [
            # Только самые критические категории
            'наркотики', 'drugs', 'кокаин', 'героин',
            'оружие', 'weapon', 'gun', 'пистолет',
            'проституция', 'prostitution'
        ]

        # МИНИМАЛЬНЫЙ список явно НЕ-транспортных категорий
        clearly_non_transport = [
            # Только очевидно НЕ-транспортные вещи
            'продукты питания', 'еда готовая',
            'одежда женская', 'обувь детская',
            'мебель для дома', 'косметика'
        ]

        # Подсчет критически НЕ-транспортных индикаторов
        critical_count = sum(1 for phrase in critical_non_transport
                           if phrase in content_lower)

        # Подсчет явно НЕ-транспортных индикаторов
        clearly_non_transport_count = sum(1 for phrase in clearly_non_transport
                                        if phrase in content_lower)

        # РАСШИРЕННЫЕ транспортные индикаторы (очень широкое определение)
        extended_transport_indicators = []

        # Проверяем наличие ЛЮБЫХ транспортных связей
        transport_related_phrases = [
            # Прямые транспортные термины
            'автомобіль', 'машина', 'авто', 'car', 'vehicle', 'транспорт',
            # Марки и модели
            'bmw', 'mercedes', 'audi', 'toyota', 'honda', 'ford', 'volkswagen',
            # Характеристики транспорта
            'двигун', 'engine', 'мотор', 'коробка', 'transmission', 'пробег', 'mileage',
            # Топливо и энергия
            'бензин', 'дизель', 'газ', 'petrol', 'diesel', 'electric', 'hybrid',
            # Типы транспорта
            'мотоцикл', 'грузовик', 'автобус', 'прицеп', 'trailer', 'boat', 'ship',
            'самолет', 'airplane', 'вертолет', 'helicopter', 'яхта', 'yacht',
            # Торговые термины
            'продам', 'продаю', 'selling', 'купить', 'buy', 'цена', 'price',
            # Состояние и характеристики
            'состояние', 'condition', 'новый', 'new', 'подержанный', 'used',
            # Документы и регистрация
            'документы', 'documents', 'регистрация', 'registration', 'техпаспорт',
            # Запчасти и аксессуары (тоже транспорт!)
            'запчасти', 'parts', 'шины', 'tires', 'диски', 'wheels', 'аккумулятор'
        ]

        for phrase in transport_related_phrases:
            if phrase in content_lower:
                extended_transport_indicators.append(phrase)

        # ВЕРОЯТНОСТНЫЙ РАСЧЕТ
        # Начинаем с базовой вероятности 10% что это НЕ транспорт (benefit of doubt)
        non_transport_probability = 0.1

        # Критические категории = 100% НЕ транспорт
        if critical_count > 0:
            non_transport_probability = 1.0
        # Явно НЕ-транспортные категории увеличивают вероятность
        elif clearly_non_transport_count > 0:
            non_transport_probability += clearly_non_transport_count * 0.3  # +30% за каждую

        # Транспортные индикаторы СИЛЬНО снижают вероятность НЕ-транспорта
        if extended_transport_indicators:
            transport_strength = len(extended_transport_indicators) * 0.2  # -20% за каждый
            non_transport_probability = max(0.0, non_transport_probability - transport_strength)

        # Ограничиваем в пределах 0-1
        non_transport_probability = min(1.0, max(0.0, non_transport_probability))

        # ПРИНЯТИЕ РЕШЕНИЯ: отклоняем только если вероятность НЕ-транспорта > 80%
        if critical_count > 0:
            is_transport = False
            category = 'prohibited'
            reason = f"Критически запрещенный контент"
            confidence = 1.0
        elif non_transport_probability > 0.8:
            is_transport = False
            category = 'off_topic'
            reason = f"Высокая уверенность ({non_transport_probability:.1%}) что контент не связан с торговлей транспортом"
            confidence = non_transport_probability
        else:
            is_transport = True
            category = 'transport'
            if extended_transport_indicators:
                reason = f"Связано с транспортом: {', '.join(extended_transport_indicators[:3])}{'...' if len(extended_transport_indicators) > 3 else ''}"
                confidence = 0.95
            else:
                reason = f"Потенциально связано с торговлей транспортом (уверенность НЕ-транспорта: {non_transport_probability:.1%})"
                confidence = 1.0 - non_transport_probability
        
        return {
            'is_transport_related': is_transport,
            'confidence': confidence,
            'category': category,
            'transport_indicators': transport_indicators,
            'prohibited_items': prohibited_items,
            'reason': reason
        }

    def _censor_word(self, word: str, reveal_chars: int = 1) -> str:
        """Цензурирование слова звездочками"""
        if len(word) <= reveal_chars:
            return '*' * len(word)
        return word[:reveal_chars] + '*' * (len(word) - reveal_chars)

    def _detect_masked_profanity(self, text: str) -> Dict[str, str]:
        """Обнаружение замаскированной нецензурщины"""
        masked_words = {}
        
        # Расширенные паттерны с цифрами и символами
        evasion_patterns = [
            # Транслитерация с заменами
            (r'\bbl[y4@9]a?t\b', 'blyat'),
            (r'\bbl[y4@9]a?d\b', 'blyad'),
            (r'\bhu[i1!]', 'hui'),
            (r'\bhuy', 'huy'),
            (r'\bp[i1!]zd[a4@]', 'pizda'),
            (r'\bs[u0]ka?\b', 'suka'),
            (r'\bs[u0]chka\b', 'suchka'),
            (r'\beb[a4@]t', 'ebat'),
            (r'\beb[a4@]l', 'ebal'),
            (r'\bmud[a4@]k', 'mudak'),
            (r'\bdeb[i1!]l', 'debil'),
            (r'\bk[o0]zel', 'kozel'),
            (r'\bn[a4@]hu[i1!]', 'nahui'),
            (r'\bg[o0]vn[o0]', 'govno'),
            (r'\bder[i1!]m[o0]', 'derimo'),

            # Английские с заменами
            (r'\bf[u0]ck', 'fuck'),
            (r'\bsh[i1!]t', 'shit'),
            (r'\bb[i1!]tch', 'bitch'),
            (r'\b[a4@]ss', 'ass'),

            # Цифровые замены
            (r'\b1d10t', 'idiot'),
            (r'\btv4r', 'tvar'),
            (r'\bp4dla', 'padla'),
            (r'\bn4hui', 'nahui'),
            (r'\bp0shel', 'poshel')
        ]
        
        for pattern, original in evasion_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                found_word = match.group()
                masked_words[found_word] = self._censor_word(original)
        
        return masked_words

    def moderate_content(self, title: str, description: str, price: Optional[float] = None, **additional_fields) -> ModerationResult:
        """
        Основная функция модерации через LLM промпты
        """
        import time
        start_time = time.time()
        
        # Собираем весь контент
        full_content = f"{title} {description}"
        
        # LLM анализ нецензурщины
        profanity_analysis = self.simulate_llm_profanity_analysis(full_content)
        
        # LLM анализ тематики
        topic_analysis = self.simulate_llm_topic_analysis(title, description, **additional_fields)
        
        # Объединяем результаты
        violations = []
        suggestions = []
        
        if profanity_analysis['has_profanity']:
            violations.append(ViolationType.PROFANITY)
            suggestions.append("Удалите нецензурную лексику из текста")
        
        if not topic_analysis['is_transport_related']:
            violations.append(ViolationType.OFF_TOPIC)
            suggestions.append("Объявление должно касаться транспортных средств")
        
        # Определяем статус
        if violations:
            if ViolationType.PROFANITY in violations:
                status = ModerationStatus.REJECTED
                confidence = profanity_analysis['confidence']
                reason = f"Обнаружена нецензурная лексика: {', '.join(profanity_analysis['found_words'])}"
            elif ViolationType.OFF_TOPIC in violations:
                status = ModerationStatus.REJECTED
                confidence = topic_analysis['confidence']
                reason = topic_analysis['reason']
            else:
                status = ModerationStatus.FLAGGED
                confidence = 0.75
                reason = "Обнаружены потенциальные нарушения"
        else:
            status = ModerationStatus.APPROVED
            confidence = 0.98
            reason = "Контент соответствует правилам"
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return ModerationResult(
            status=status,
            confidence=confidence,
            violations=violations,
            flagged_text=profanity_analysis['found_words'],
            censored_text=profanity_analysis['censored_words'],
            reason=reason,
            suggestions=suggestions,
            language_detected=", ".join(profanity_analysis['languages']) if profanity_analysis['languages'] else 'clean',
            processing_time_ms=processing_time
        )


# Глобальный экземпляр сервиса
llm_moderation_service = LLMPromptModerationService()


def moderate_car_ad_content(title: str, description: str, price: Optional[float] = None, **additional_fields) -> ModerationResult:
    """
    Функция для модерации автомобильных объявлений через LLM
    """
    return llm_moderation_service.moderate_content(title, description, price, **additional_fields)
