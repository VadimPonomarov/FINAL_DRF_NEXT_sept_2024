"""
Intelligent intent classifier using LLM with structured Pydantic responses.

This classifier uses semantic analysis and context understanding instead of
rigid keyword matching. It leverages Pydantic models for type-safe structured
outputs from LLM responses.
"""

import json
import logging
from typing import Optional, Type, TypeVar
from enum import Enum

import g4f
from pydantic import BaseModel, Field, ValidationError

from apps.chat.types.types import AgentState, DataMode, Intent

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class G4FStructuredAdapter:
    """
    Adapter for g4f to work with structured Pydantic responses.
    
    This is similar to the instructor library pattern but adapted for g4f.
    """
    
    @staticmethod
    def create_structured_prompt(
        user_query: str,
        response_model: Type[T],
        system_instructions: str = ""
    ) -> str:
        """
        Create a prompt that instructs the LLM to respond with valid JSON
        matching the Pydantic model schema.
        
        Args:
            user_query: The user's question/query to analyze
            response_model: Pydantic model class defining the expected structure
            system_instructions: Additional context and instructions
            
        Returns:
            Formatted prompt string
        """
        # Get JSON schema from Pydantic model
        schema = response_model.model_json_schema()
        
        # Build enum descriptions if present
        enum_descriptions = []
        for field_name, field_info in response_model.model_fields.items():
            if hasattr(field_info.annotation, '__members__'):
                # It's an Enum
                enum_class = field_info.annotation
                enum_descriptions.append(f"\n{field_name} must be one of:")
                for member in enum_class:
                    enum_descriptions.append(f"  - {member.value}: {member.name}")
        
        enum_text = "\n".join(enum_descriptions) if enum_descriptions else ""
        
        prompt = f"""{system_instructions}

You must respond with ONLY a valid JSON object matching this exact structure:
{json.dumps(schema, indent=2)}

{enum_text}

Query to analyze: {user_query}

Respond with ONLY the JSON object, no other text."""
        
        return prompt
    
    @staticmethod
    def parse_response(
        response: str,
        response_model: Type[T]
    ) -> Optional[T]:
        """
        Parse LLM response into a Pydantic model instance.
        
        Args:
            response: Raw text response from LLM
            response_model: Pydantic model class to parse into
            
        Returns:
            Validated Pydantic model instance or None if parsing fails
        """
        try:
            # Try to extract JSON from response
            # Sometimes LLM adds markdown code blocks
            response = response.strip()
            
            # Remove markdown code blocks if present
            if response.startswith('```'):
                # Find the actual JSON content
                lines = response.split('\n')
                json_lines = []
                in_code_block = False
                for line in lines:
                    if line.startswith('```'):
                        in_code_block = not in_code_block
                        continue
                    if in_code_block or (not line.startswith('```') and '{' in line):
                        json_lines.append(line)
                response = '\n'.join(json_lines)
            
            # Try to find JSON object in response
            start_idx = response.find('{')
            end_idx = response.rfind('}')
            
            if start_idx != -1 and end_idx != -1:
                json_str = response[start_idx:end_idx + 1]
                data = json.loads(json_str)
                return response_model.model_validate(data)
            
            # If no braces found, try parsing the whole response
            data = json.loads(response)
            return response_model.model_validate(data)
            
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Failed to parse structured response: {e}")
            logger.debug(f"Raw response: {response}")
            return None
    
    @classmethod
    def completion(
        cls,
        user_query: str,
        response_model: Type[T],
        system_instructions: str = "",
        model: str = "gpt-4"
    ) -> Optional[T]:
        """
        Complete structured completion with g4f and parse into Pydantic model.
        
        Args:
            user_query: User's query to analyze
            response_model: Pydantic model for response structure
            system_instructions: Additional instructions for the LLM
            model: g4f model to use
            
        Returns:
            Parsed and validated Pydantic model instance
        """
        try:
            # Create structured prompt
            prompt = cls.create_structured_prompt(
                user_query=user_query,
                response_model=response_model,
                system_instructions=system_instructions
            )
            
            # Call g4f
            response = g4f.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a precise classifier that responds with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                stream=False
            )
            
            # Parse response
            return cls.parse_response(response, response_model)
            
        except Exception as e:
            logger.error(f"G4F structured completion failed: {e}")
            return None


class IntentClassification(BaseModel):
    """Pydantic model for intent classification result."""
    
    intent: Intent = Field(
        description="The classified intent type based on semantic analysis of the query"
    )
    data_mode: DataMode = Field(
        description="Whether the query requires real-time data or can use historical knowledge"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Classification confidence score from 0.0 to 1.0"
    )
    reasoning: str = Field(
        description="Brief explanation of why this classification was chosen, analyzing the query context"
    )


class IntelligentIntentClassifier:
    """
    Intelligent intent classifier using LLM for semantic understanding.
    
    This classifier:
    - Uses LLM to understand query context and semantics
    - Returns structured Pydantic responses (type-safe)
    - Avoids rigid keyword matching
    - Provides reasoning for classifications
    """
    
    def __init__(self):
        self.adapter = G4FStructuredAdapter()
        self.system_instructions = self._build_system_instructions()
    
    def _build_system_instructions(self) -> str:
        """Build comprehensive system instructions for the classifier."""
        
        return """You are an expert intent classifier for a multi-modal AI assistant.

**Your task:** Analyze the user's query and determine:
1. What TYPE of request is this (intent)?
2. Does it need CURRENT information (realtime) or GENERAL knowledge (historical)?

**Available Intents:**
- GENERAL_CHAT: Casual conversation, greetings, questions that don't need specific tools
- TEXT_GENERATION: Creative writing, stories, articles, poems
- IMAGE_GENERATION: Requests to create/draw/generate visual content
- FACTUAL_SEARCH: Questions needing factual information, current events, Wikipedia, search
- WEB_CRAWLING: Requests to parse/extract/scrape data from specific URLs
- CODE_EXECUTION: Running or executing code
- MATHEMATICS: Math calculations, equations, numerical problems
- DATA_ANALYSIS: Statistical analysis, data grouping, visualization with pandas/seaborn
- DATETIME: Questions about current time/date
- FILE_READ/WRITE/ANALYSIS: File operations

**Data Mode Logic:**
- REALTIME: Use for current events, "who is president NOW", latest news, real-time data, Wikipedia lookups
- HISTORICAL: Use for general knowledge, creative tasks, math, concepts, procedures

**Analysis Guidelines:**
1. **Semantic Analysis:** Understand the MEANING, not just keywords
   - "Найди информацию о квантовой физике" → FACTUAL_SEARCH (even without "Wikipedia")
   - "Реши уравнение" → MATHEMATICS (clear intent despite no math symbols)

2. **Context Matters:**
   - "президент США" + temporal markers → FACTUAL_SEARCH + REALTIME
   - "как работает фотосинтез" → GENERAL_CHAT + HISTORICAL
   - "спарсь курсы с сайта" → WEB_CRAWLING (explicit URL parsing)

3. **Creative vs Factual:**
   - "нарисуй", "создай картинку", "портрет" → IMAGE_GENERATION
   - "найди", "расскажи о", "что такое" → FACTUAL_SEARCH

4. **Math Detection:**
   - Look for numerical problem-solving intent
   - "реши", "вычисли", equations, "найди корни" → MATHEMATICS

5. **Wikipedia/Search:**
   - Questions seeking factual information should use FACTUAL_SEARCH
   - Even without explicit "search" or "Wikipedia", if it's asking for facts → FACTUAL_SEARCH

**Examples:**
- "Найди информацию в Wikipedia о квантовой физике" → FACTUAL_SEARCH + REALTIME
- "Реши уравнение: 3x^2 + 7x - 20 = 0" → MATHEMATICS + HISTORICAL
- "Спарсь курсы валют с https://example.com" → WEB_CRAWLING + REALTIME
- "Нарисуй портрет Трампа" → IMAGE_GENERATION + HISTORICAL
- "Кто президент США" → FACTUAL_SEARCH + REALTIME
- "Как работает квантовая физика" → GENERAL_CHAT + HISTORICAL
- "Посчитай статистику по этим данным" → DATA_ANALYSIS + HISTORICAL
- "Построй график корреляции" → DATA_ANALYSIS + HISTORICAL
- "Сгруппируй данные по категориям" → DATA_ANALYSIS + HISTORICAL

**Important:**
- Be consistent but flexible
- Analyze the INTENT behind the words
- Provide clear reasoning for your decision"""
    
    def classify(self, query: str) -> IntentClassification:
        """
        Classify user query with intelligent semantic analysis.
        
        Args:
            query: User query to classify
            
        Returns:
            IntentClassification with intent, data_mode, confidence, and reasoning
        """
        if not query or not query.strip():
            return IntentClassification(
                intent=Intent.GENERAL_CHAT,
                data_mode=DataMode.HISTORICAL,
                confidence=1.0,
                reasoning="Empty query defaults to general chat"
            )
        
        try:
            # Use structured adapter to get classification
            result = self.adapter.completion(
                user_query=query.strip(),
                response_model=IntentClassification,
                system_instructions=self.system_instructions,
                model="gpt-4"
            )
            
            if result:
                logger.info(
                    f"Intelligent classification: '{query}' → {result.intent.value} "
                    f"({result.data_mode.value}) [{result.confidence:.2f}] - {result.reasoning}"
                )
                return result
            
            # Fallback if structured parsing failed
            logger.warning("Structured classification failed, using semantic fallback")
            return self._semantic_fallback(query)
            
        except Exception as e:
            logger.error(f"Classification error: {e}", exc_info=True)
            return self._semantic_fallback(query)
    
    def _semantic_fallback(self, query: str) -> IntentClassification:
        """
        Semantic fallback using basic pattern matching.
        Only used when LLM classification completely fails.
        """
        query_lower = query.lower()
        
        # Check for URLs (high confidence)
        if 'http://' in query or 'https://' in query:
            return IntentClassification(
                intent=Intent.WEB_CRAWLING,
                data_mode=DataMode.REALTIME,
                confidence=0.85,
                reasoning="Fallback: URL detected in query"
            )
        
        # Check for mathematical expressions
        if any(char in query for char in ['+', '-', '*', '/', '=', '^']) and any(c.isdigit() for c in query):
            return IntentClassification(
                intent=Intent.MATHEMATICS,
                data_mode=DataMode.HISTORICAL,
                confidence=0.8,
                reasoning="Fallback: Mathematical expression detected"
            )
        
        # Check for image generation keywords
        image_words = ['нарисуй', 'draw', 'создай картинку', 'generate image', 'портрет', 'portrait']
        if any(word in query_lower for word in image_words):
            return IntentClassification(
                intent=Intent.IMAGE_GENERATION,
                data_mode=DataMode.HISTORICAL,
                confidence=0.75,
                reasoning="Fallback: Image generation keywords detected"
            )
        
        # Check for information seeking
        info_words = ['найди', 'find', 'search', 'wikipedia', 'информация', 'information']
        if any(word in query_lower for word in info_words):
            return IntentClassification(
                intent=Intent.FACTUAL_SEARCH,
                data_mode=DataMode.REALTIME,
                confidence=0.7,
                reasoning="Fallback: Information seeking pattern detected"
            )
        
        # Default to general chat
        return IntentClassification(
            intent=Intent.GENERAL_CHAT,
            data_mode=DataMode.HISTORICAL,
            confidence=0.5,
            reasoning="Fallback: No specific pattern detected"
        )
    
    def classify_state(self, state: AgentState) -> AgentState:
        """
        Classify intent for AgentState and update it.
        
        Args:
            state: Current agent state
            
        Returns:
            Updated state with classification results
        """
        try:
            classification = self.classify(state.query)
            
            return state.model_copy(update={
                "intent": classification.intent,
                "data_mode": classification.data_mode,
                "metadata": {
                    **state.metadata,
                    "classification_timestamp": state.now,
                    "classifier_version": "intelligent_v1.0",
                    "classification_confidence": classification.confidence,
                    "classification_reasoning": classification.reasoning
                }
            })
        
        except Exception as e:
            logger.error(f"State classification error: {e}", exc_info=True)
            return state.model_copy(update={
                "error": f"Classification error: {str(e)}"
            })


# Global intelligent classifier instance
intelligent_classifier = IntelligentIntentClassifier()


__all__ = [
    'IntelligentIntentClassifier',
    'IntentClassification',
    'G4FStructuredAdapter',
    'intelligent_classifier'
]

