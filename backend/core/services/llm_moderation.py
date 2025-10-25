"""
Интеллектуальная LLM-модерация на основе промптов
Анализирует контент через промптирование вместо жестких правил
Использует ChatAI с PollinationsAI провайдером
LangChain JsonOutputParser для надежного парсинга JSON
"""
import re
import json
import logging
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Import ChatAI for real LLM moderation
try:
    import g4f
    from g4f import Client
    LLM_AVAILABLE = True
    logger.info("[OK] g4f ChatAI available for LLM moderation")
except ImportError as e:
    LLM_AVAILABLE = False
    logger.warning(f"[ERROR] g4f not available: {e}. Using simulation mode.")

# Import LangChain JsonOutputParser for robust JSON parsing
try:
    from langchain_core.output_parsers import JsonOutputParser
    from langchain_core.prompts import PromptTemplate
    LANGCHAIN_AVAILABLE = True
    logger.info("[OK] LangChain JsonOutputParser available")
except ImportError as e:
    LANGCHAIN_AVAILABLE = False
    logger.warning(f"[WARN] LangChain not available: {e}. Using manual JSON parsing.")


# ===== HARD BLOCK DICTIONARY FOR 100% CENSORSHIP =====
# This list is checked BEFORE LLM to guarantee blocking of known profanity
# Ukrainian, Russian, and English profanity with common variations
HARD_BLOCK_PROFANITY = {
    # Ukrainian profanity (original, transliterated, masked)
    'блять', 'бля', 'блядь', 'бляха', 'блядство',
    'blyat', 'blya', 'blyad', 'blyaha', 'bl@t', 'bl@d',
    'хуй', 'хуя', 'хуйня', 'хуйло', 'хуёвий', 'хуєвий',
    'hui', 'huy', 'huilo', 'huynia', 'h@i', 'h@y',
    'пизда', 'піздець', 'пиздець', 'піздити', 'пиздити',
    'pizda', 'pizdec', 'pizdets', 'p1zda', 'p!zda', 
    'єбать', 'ебать', 'їбати', 'їбало', 'ібати', 'ебало',
    'ebat', 'yebat', 'jebat', 'ebalo', 'e6at', 'eb@t',
    'сука', 'суки', 'сучка', 'сучки',
    'suka', 'suki', 'suchka', 's@ka',
    'їбнутий', 'єбнутий', 'ебнутий', 'йобаний', 'ёбаный',
    'ebnytyi', 'ebnutyi', 'yobanyi', 'jobanyi',
    'мудак', 'мудила', 'мудило', 'мудаки',
    'mudak', 'mudila', 'mudilo', 'm@dak',
    'дебіл', 'дебил', 'дебильний',
    'debil', 'debyl', 'd3bil',
    'йолоп', 'йолопи', 'йолопство',
    'yolop', 'jolop', 'j0lop',
    'гівно', 'говно', 'гівняний', 'гавно',
    'govno', 'gowno', 'g0vno', 'gavno',
    'сцикло', 'сцикун',
    'scyklo', 'scykun',
    
    # Russian profanity (original, transliterated, masked)
    'пидор', 'пидарас', 'пидр', 'пидр', 'пид0р',
    'pidor', 'pidaras', 'pidr', 'p1dor', 'p!dor',
    'падла', 'падло',
    'padla', 'padlo', 'p@dla',
    'шлюха', 'шлюхи', 'шлюха',
    'shluha', 'shlukha', 'shl@ha',
    'чмо', 'чмошник',
    'chmo', 'chmoshnik', 'ch~o',
    'жопа', 'жопи', 'жопний',
    'zhopa', 'jopa', 'zh0pa',
    'долбоёб', 'долбаёб', 'долбоеб',
    'dolboeb', 'dolbaeb', 'd0lb0eb',
    
    # English profanity (for completeness)
    'fuck', 'fucking', 'fucked', 'fucker', 'f@ck', 'f*ck',
    'shit', 'shitting', 'shitty', 'sh1t', 'sh!t',
    'bitch', 'bitches', 'bitching', 'b1tch', 'b!tch',
    'ass', 'asshole', '@ss', '@sshole',
    'cunt', 'c@nt', 'c*nt',
    'dick', 'dickhead', 'd1ck',
    'bastard', 'b@stard',
    'damn', 'damned', 'd@mn',
}

# Normalize the set (lowercase for case-insensitive matching)
HARD_BLOCK_PROFANITY = {word.lower() for word in HARD_BLOCK_PROFANITY}

logger.info(f"[OK] Hard block profanity dictionary loaded with {len(HARD_BLOCK_PROFANITY)} words")


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


# Pydantic models for LangChain JsonOutputParser
class ProfanityAnalysisOutput(BaseModel):
    """Structured output for profanity analysis"""
    has_profanity: bool = Field(description="Whether profanity was detected")
    found_words: List[str] = Field(default_factory=list, description="List of detected profane words")
    languages: List[str] = Field(default_factory=list, description="Languages detected (ukrainian, russian, english)")
    severity: str = Field(default="low", description="Severity level: low, medium, high")
    confidence: float = Field(default=0.95, description="Confidence score 0.0-1.0")


class TopicAnalysisOutput(BaseModel):
    """Structured output for topic analysis"""
    is_transport_related: bool = Field(description="Whether content is vehicle-related")
    confidence: float = Field(default=0.95, description="Confidence score 0.0-1.0")
    category: str = Field(default="transport", description="Category: transport, off_topic, prohibited")
    reason: str = Field(description="Brief explanation of the decision")
    transport_indicators: List[str] = Field(default_factory=list, description="Detected transport-related keywords")


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


class ChatAIService:
    """ChatAI service for LLM-based moderation using PollinationsAI provider."""
    
    def __init__(self):
        """Initialize ChatAI service with default model and JsonOutputParser."""
        self.client = Client() if LLM_AVAILABLE else None
        self.text_model = "gpt-4"  # Default model for g4f
        self.provider = "PollinationsAI"  # Using PollinationsAI as provider
        
        # Initialize LangChain JsonOutputParser if available
        if LANGCHAIN_AVAILABLE:
            self.profanity_parser = JsonOutputParser(pydantic_object=ProfanityAnalysisOutput)
            self.topic_parser = JsonOutputParser(pydantic_object=TopicAnalysisOutput)
            logger.info("[OK] LangChain JsonOutputParser initialized with Pydantic models")
        else:
            self.profanity_parser = None
            self.topic_parser = None
        
    def generate_text(self, messages: List[Dict[str, str]], model: Optional[str] = None) -> str:
        """
        Generate text response using ChatAI with PollinationsAI.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Optional model override (defaults to gpt-4)
            
        Returns:
            Generated text response
        """
        if not LLM_AVAILABLE or not self.client:
            logger.warning("LLM not available, falling back to simulation")
            raise Exception("LLM not available")
            
        try:
            logger.info(f"[ChatAI] Request with {len(messages)} messages using {self.provider}")
            
            response = g4f.ChatCompletion.create(
                model=model or self.text_model,
                messages=messages,
                stream=False
            )
            
            result = str(response)
            logger.info(f"[ChatAI] Response received: {len(result)} chars")
            return result
            
        except Exception as e:
            logger.error(f"[ERROR] ChatAI generation error: {e}")
            raise


class LLMPromptModerationService:
    """
    LLM-модерация на основе промптов
    Использует интеллектуальный анализ через ChatAI с PollinationsAI
    Автоматический fallback на симуляцию если LLM недоступен
    """
    
    def __init__(self):
        """Initialize moderation service with ChatAI."""
        # Initialize ChatAI for real LLM analysis
        self.chatai = ChatAIService() if LLM_AVAILABLE else None
        self.use_llm = LLM_AVAILABLE and self.chatai is not None
        
        if self.use_llm:
            logger.info("[LLM] Moderation: Using ChatAI with PollinationsAI")
        else:
            logger.info("[SIM] Moderation: Using simulation mode (g4f not available)")
        
        # Profanity examples for fallback simulation
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

    def _hard_block_check(self, content: str, start_time: float) -> Optional[Dict[str, Any]]:
        """
        HARD BLOCK CHECK - runs BEFORE LLM for guaranteed blocking of known profanity.
        Returns moderation result if profanity found, None otherwise.
        This ensures 100% blocking rate for known Ukrainian/Russian/English profanity.
        """
        content_lower = content.lower()
        found_words = []
        censored_mapping = {}
        detected_languages = set()
        
        # Normalize text: replace punctuation with spaces for word boundary detection
        normalized = content_lower
        for punct in '.,!?;:\'"()[]{}«»""—–-/\\|@#$%^&*+=<>~`':
            normalized = normalized.replace(punct, ' ')
        
        # Extract words
        words_in_content = set(word.strip() for word in normalized.split() if word.strip())
        
        # Check against hard block dictionary (word boundary matching only - fast)
        for word in words_in_content:
            if word in HARD_BLOCK_PROFANITY:
                found_words.append(word)
                censored_mapping[word] = self._censor_word(word)
                # Detect language (simple heuristic based on character set)
                if any(ord(c) in range(0x0400, 0x04FF) for c in word):
                    # Cyrillic detected
                    detected_languages.add('ukrainian' if 'є' in word or 'і' in word or 'ї' in word else 'russian')
                elif word.isascii():
                    detected_languages.add('english')
                else:
                    detected_languages.add('transliteration')
        
        if found_words:
            processing_time = int((time.time() - start_time) * 1000)
            logger.warning(f"[HARD_BLOCK] Detected profanity: {found_words[:3]}{'...' if len(found_words) > 3 else ''}")
            return {
                'has_profanity': True,
                'confidence': 1.0,  # 100% confidence for hard block
                'found_words': found_words,
                'censored_words': censored_mapping,
                'languages': list(detected_languages),
                'severity': 'high',
                'processing_time_ms': processing_time
            }
        
        return None  # No profanity found, continue to LLM

    def llm_profanity_analysis(self, content: str) -> Dict[str, Any]:
        """
        LLM анализ нецензурной лексики через ChatAI.
        ВАЖНО: Сначала проверяет hard block словарь для гарантированного блока.
        Автоматический fallback на симуляцию при ошибке LLM.
        """
        start_time = time.time()
        
        # STEP 1: Hard block check FIRST (before LLM) - 100% guaranteed blocking
        hard_block_result = self._hard_block_check(content, start_time)
        if hard_block_result:
            return hard_block_result
        
        # STEP 2: Try real LLM analysis (for nuanced/masked profanity detection)
        if self.use_llm:
            try:
                return self._real_llm_profanity_analysis(content, start_time)
            except Exception as e:
                logger.warning(f"LLM profanity analysis failed: {e}. Falling back to simulation.")
                # Continue to simulation fallback below
        
        # STEP 3: Fallback to simulation
        return self._simulate_profanity_analysis(content, start_time)
    
    def _real_llm_profanity_analysis(self, content: str, start_time: float) -> Dict[str, Any]:
        """Real LLM-based profanity analysis using ChatAI with LangChain JsonOutputParser."""
        
        # Use LangChain JsonOutputParser if available
        if LANGCHAIN_AVAILABLE and self.chatai.profanity_parser:
            format_instructions = self.chatai.profanity_parser.get_format_instructions()
            system_content = f"""You are a JSON API endpoint that detects profanity.

Detect profanity in: English, Russian, Ukrainian. Detect direct, masked (bl@t, p1zda), and transliterated (blyat, nahui) profanity.

{format_instructions}

CRITICAL: Output ONLY valid JSON matching the schema. No markdown, no explanations."""
        else:
            # Fallback to manual instructions
            system_content = """You are a JSON API endpoint that detects profanity. You MUST respond with ONLY valid JSON, no other text.

Detect profanity in: English, Russian, Ukrainian. Detect direct, masked (bl@t, p1zda), and transliterated (blyat, nahui) profanity.

Response format (ONLY JSON, no explanations):
{
    "has_profanity": true,
    "found_words": ["word1", "word2"],
    "languages": ["ukrainian"],
    "severity": "high",
    "confidence": 0.95
}

Rules:
- has_profanity: boolean
- found_words: array of detected profane words
- languages: array from ["ukrainian", "russian", "english", "transliteration"]
- severity: "low" | "medium" | "high"
- confidence: number 0.0-1.0

CRITICAL: Output ONLY the JSON object. No markdown, no explanations."""
        
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": f"Analyze: {content}"}
        ]
        
        try:
            response = self.chatai.generate_text(messages)
            
            # Try LangChain parser first
            if LANGCHAIN_AVAILABLE and self.chatai.profanity_parser:
                try:
                    result = self.chatai.profanity_parser.parse(response)
                    logger.info("[LangChain] Successfully parsed with JsonOutputParser")
                except Exception as e:
                    logger.warning(f"[LangChain] Parser failed: {e}. Trying manual parsing.")
                    # Fallback to manual parsing
                    result = self._manual_json_parse(response)
            else:
                # Manual JSON parsing
                result = self._manual_json_parse(response)
            
            # Process found words to create censored mapping
            found_words = result.get('found_words', []) if isinstance(result, dict) else result.found_words
            censored_mapping = {}
            for word in found_words:
                censored_mapping[word] = self._censor_word(word)
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Handle both dict and Pydantic model
            if isinstance(result, dict):
                return {
                    'has_profanity': result.get('has_profanity', False),
                    'confidence': result.get('confidence', 0.95),
                    'found_words': result.get('found_words', []),
                    'censored_words': censored_mapping,
                    'languages': result.get('languages', []),
                    'severity': result.get('severity', 'low'),
                    'processing_time_ms': processing_time
                }
            else:
                # Pydantic model
                return {
                    'has_profanity': result.has_profanity,
                    'confidence': result.confidence,
                    'found_words': result.found_words,
                    'censored_words': censored_mapping,
                    'languages': result.languages,
                    'severity': result.severity,
                    'processing_time_ms': processing_time
                }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}. Response: {response[:200]}")
            raise
        except Exception as e:
            logger.error(f"LLM profanity analysis error: {e}")
            raise
    
    def _manual_json_parse(self, response: str) -> Dict[str, Any]:
        """Manual JSON parsing with markdown cleanup."""
        response_clean = response.strip()
        if response_clean.startswith("```json"):
            response_clean = response_clean[7:]
        if response_clean.startswith("```"):
            response_clean = response_clean[3:]
        if response_clean.endswith("```"):
            response_clean = response_clean[:-3]
        response_clean = response_clean.strip()
        return json.loads(response_clean)
    
    def _simulate_profanity_analysis(self, content: str, start_time: float) -> Dict[str, Any]:
        """
        Fallback simulation of profanity analysis using pattern matching.
        """
        content_lower = content.lower()
        found_words = []
        censored_mapping = {}
        detected_languages = []
        
        # Симуляция интеллектуального анализа - МАКСИМАЛЬНО ПРОСТОЙ подход
        # Разбиваем текст на слова, заменяя знаки препинания на пробелы БЕЗ REGEX
        try:
            # Заменяем знаки препинания на пробелы простым циклом
            cleaned = content_lower
            for punct in '.,!?;:\'"()[]{}«»""—–-/\\|@#$%^&*+=<>~`':
                cleaned = cleaned.replace(punct, ' ')
            # Разбиваем на слова
            words_in_content = set(word.strip() for word in cleaned.split() if word.strip())
        except Exception as e:
            logger.error(f"Error processing content: {e}")
            words_in_content = set()
        
        # Ищем нецензурные слова
        for lang, examples in self.profanity_examples.items():
            for word in examples:
                if word.lower() in words_in_content:
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

    def llm_topic_analysis(self, title: str, description: str, **fields) -> Dict[str, Any]:
        """
        LLM анализ тематики через ChatAI.
        Автоматический fallback на симуляцию при ошибке.
        """
        # Try real LLM analysis first
        if self.use_llm:
            try:
                return self._real_llm_topic_analysis(title, description, **fields)
            except Exception as e:
                logger.warning(f"LLM topic analysis failed: {e}. Falling back to simulation.")
                # Continue to simulation fallback below
        
        # Fallback to simulation
        return self._simulate_topic_analysis(title, description, **fields)
    
    def _real_llm_topic_analysis(self, title: str, description: str, **fields) -> Dict[str, Any]:
        """Real LLM-based topic analysis using ChatAI with LangChain JsonOutputParser."""
        # Collect all content
        all_content = f"Title: {title}\nDescription: {description}"
        for field_name, field_value in fields.items():
            if isinstance(field_value, str):
                all_content += f"\n{field_name}: {field_value}"
        
        # Use LangChain JsonOutputParser if available
        if LANGCHAIN_AVAILABLE and self.chatai.topic_parser:
            format_instructions = self.chatai.topic_parser.get_format_instructions()
            system_content = f"""You are a JSON API endpoint for vehicle marketplace moderation.

ALLOWED: Cars, motorcycles, trucks, buses, boats, yachts, aircraft, vehicle parts, tires, vehicle services.
REJECTED: Real estate, electronics, clothing, food, adult content, drugs, weapons.

{format_instructions}

CRITICAL: Output ONLY valid JSON matching the schema. No markdown, no explanations."""
        else:
            # Fallback to manual instructions
            system_content = """You are a JSON API endpoint for vehicle marketplace moderation. You MUST respond with ONLY valid JSON.

ALLOWED: Cars, motorcycles, trucks, buses, boats, yachts, aircraft, vehicle parts, tires, vehicle services.
REJECTED: Real estate, electronics, clothing, food, adult content, drugs, weapons.

Response format (ONLY JSON):
{
    "is_transport_related": true,
    "confidence": 0.95,
    "category": "transport",
    "reason": "Contains vehicle keywords",
    "transport_indicators": ["car", "engine"]
}

Rules:
- is_transport_related: boolean
- confidence: number 0.0-1.0
- category: "transport" | "off_topic" | "prohibited"
- reason: string (max 100 chars)
- transport_indicators: array of strings

CRITICAL: Output ONLY the JSON object. No markdown, no explanations."""
        
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": f"Analyze: {all_content}"}
        ]
        
        try:
            response = self.chatai.generate_text(messages)
            
            # Try LangChain parser first
            if LANGCHAIN_AVAILABLE and self.chatai.topic_parser:
                try:
                    result = self.chatai.topic_parser.parse(response)
                    logger.info("[LangChain] Successfully parsed with JsonOutputParser")
                except Exception as e:
                    logger.warning(f"[LangChain] Parser failed: {e}. Trying manual parsing.")
                    # Fallback to manual parsing
                    result = self._manual_json_parse(response)
            else:
                # Manual JSON parsing
                result = self._manual_json_parse(response)
            
            # Handle both dict and Pydantic model
            if isinstance(result, dict):
                return {
                    'is_transport_related': result.get('is_transport_related', True),
                    'confidence': result.get('confidence', 0.95),
                    'category': result.get('category', 'transport'),
                    'transport_indicators': result.get('transport_indicators', []),
                    'prohibited_items': [],  # Compatibility with old structure
                    'reason': result.get('reason', 'Analysis complete')
                }
            else:
                # Pydantic model
                return {
                    'is_transport_related': result.is_transport_related,
                    'confidence': result.confidence,
                    'category': result.category,
                    'transport_indicators': result.transport_indicators,
                    'prohibited_items': [],  # Compatibility with old structure
                    'reason': result.reason
                }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM topic response as JSON: {e}. Response: {response[:200]}")
            raise
        except Exception as e:
            logger.error(f"LLM topic analysis error: {e}")
            raise
    
    def _simulate_topic_analysis(self, title: str, description: str, **fields) -> Dict[str, Any]:
        """
        Fallback simulation of topic analysis using keyword matching.
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
        Основная функция модерации через LLM промпты.
        Использует ChatAI с PollinationsAI для реального анализа.
        """
        start_time = time.time()
        
        logger.info(f"[{'LLM' if self.use_llm else 'SIM'}] Moderation: Starting analysis for '{title[:50]}...'")
        
        # Собираем весь контент
        full_content = f"{title} {description}"
        
        # LLM анализ нецензурщины (real LLM or fallback to simulation)
        profanity_analysis = self.llm_profanity_analysis(full_content)
        
        # 🚀 ОПТИМИЗАЦИЯ: Если профанность найдена - сразу rejected БЕЗ topic analysis!
        # Topic analysis занимает ~60s LLM, профанность блокируется и без него
        if profanity_analysis['has_profanity']:
            processing_time = int((time.time() - start_time) * 1000)
            logger.info(f"[FAST_REJECT] Profanity detected, skipping topic analysis. Time: {processing_time}ms")
            
            return ModerationResult(
                status=ModerationStatus.REJECTED,
                confidence=profanity_analysis['confidence'],
                violations=[ViolationType.PROFANITY],
                flagged_text=profanity_analysis['found_words'],
                censored_text=profanity_analysis['censored_words'],
                reason=f"Обнаружена нецензурная лексика: {', '.join(profanity_analysis['found_words'])}",
                suggestions=["Удалите нецензурную лексику из текста"],
                language_detected=", ".join(profanity_analysis['languages']) if profanity_analysis['languages'] else 'profanity',
                processing_time_ms=processing_time
            )
        
        # LLM анализ тематики (только если НЕТ профанности)
        topic_analysis = self.llm_topic_analysis(title, description, **additional_fields)
        
        # Объединяем результаты
        violations = []
        suggestions = []
        
        if not topic_analysis['is_transport_related']:
            violations.append(ViolationType.OFF_TOPIC)
            suggestions.append("Объявление должно касаться транспортных средств")
        
        # Определяем статус
        if violations:
            if ViolationType.OFF_TOPIC in violations:
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
            flagged_text=[],  # No profanity
            censored_text={},  # No profanity
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
