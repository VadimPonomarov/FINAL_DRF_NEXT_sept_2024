"""
LLM-based intent classifier using ChatAI with Pydantic parsing.
"""

import logging
from typing import Optional
from pydantic import BaseModel, Field
from apps.chat.types.types import Intent, DataMode, AgentState
import g4f
import json

logger = logging.getLogger(__name__)


class IntentClassificationResult(BaseModel):
    """Pydantic model for intent classification result."""

    intent: Intent = Field(..., description="Classified intent type")
    data_mode: DataMode = Field(..., description="Required data mode")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence (0-1)")
    reasoning: str = Field(..., description="Brief explanation of classification decision")


class LLMIntentClassifier:
    """LLM-based intent classifier using ChatAI with structured output."""

    def __init__(self):
        self.model = "gpt-4"
        self.system_prompt = self._build_system_prompt()
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for intent classification."""
        intent_descriptions = {
            Intent.GENERAL_CHAT: "General conversation, greetings, casual questions, or requests that don't fit other categories",
            Intent.TEXT_GENERATION: "Requests for creative writing, text generation, or content creation",
            Intent.IMAGE_GENERATION: "Requests to create, generate, draw, or produce images, pictures, or visual content",
            Intent.FACTUAL_SEARCH: "Questions about current events, recent information, or requests to search for factual data",
            Intent.WEB_CRAWLING: "Requests to analyze, extract, or get information from specific websites or URLs",
            Intent.CODE_EXECUTION: "Requests to run, execute, or test code, including mathematical calculations",
            Intent.DATA_ANALYSIS: "Requests to analyze data, create charts, graphs, or perform statistical analysis",
            Intent.FILE_READ: "Requests to read, open, or view file contents",
            Intent.FILE_WRITE: "Requests to save, write, or create files",
            Intent.FILE_ANALYSIS: "Requests to analyze, review, or examine file contents",
            Intent.DATETIME: "Questions about current time, date, or temporal information"
        }

        data_mode_descriptions = {
            DataMode.HISTORICAL: "Use trained knowledge and historical data",
            DataMode.REALTIME: "Requires current, up-to-date, or real-time information"
        }

        return f"""You are an expert intent classifier for a multi-modal AI assistant. Your task is to analyze user queries and classify them into the appropriate intent and data mode.

AVAILABLE INTENTS:
{chr(10).join(f"- {intent.value}: {desc}" for intent, desc in intent_descriptions.items())}

DATA MODES:
{chr(10).join(f"- {mode.value}: {desc}" for mode, desc in data_mode_descriptions.items())}

CLASSIFICATION RULES:
1. Choose the most specific intent that matches the user's request
2. If the request mentions "current", "latest", "recent", "now", "today", or asks about news/events, use REALTIME mode
3. If the request is about general knowledge, creative tasks, or doesn't need current data, use HISTORICAL mode
4. Provide a confidence score (0.0-1.0) based on how certain you are about the classification
5. Give a brief reasoning for your decision

You must respond with a valid JSON object matching this exact structure:
{{
    "intent": "one_of_the_intent_values",
    "data_mode": "historical_or_realtime",
    "confidence": 0.95,
    "reasoning": "Brief explanation of why this classification was chosen"
}}

Be precise and consistent in your classifications."""
    
    def _classify_with_llm(self, query: str) -> IntentClassificationResult:
        """Classify intent using LLM with structured output."""
        try:
            # Prepare messages for LLM
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": f"Classify this query: {query}"}
            ]

            # Get response from ChatAI
            response = g4f.ChatCompletion.create(
                model=self.model,
                messages=messages,
                stream=False
            )

            # Parse JSON response
            try:
                result_data = json.loads(response)

                # Validate and create Pydantic model
                return IntentClassificationResult(
                    intent=Intent(result_data["intent"]),
                    data_mode=DataMode(result_data["data_mode"]),
                    confidence=float(result_data["confidence"]),
                    reasoning=str(result_data["reasoning"])
                )

            except (json.JSONDecodeError, KeyError, ValueError) as e:
                logger.warning(f"Failed to parse LLM response: {e}. Response: {response}")
                # Fallback to default classification
                return self._fallback_classification(query)

        except Exception as e:
            logger.error(f"LLM classification error: {e}")
            return self._fallback_classification(query)

    def _fallback_classification(self, query: str) -> IntentClassificationResult:
        """Fallback classification when LLM fails."""
        query_lower = query.lower().strip()

        # Simple heuristics as fallback
        if any(word in query_lower for word in ["image", "picture", "draw", "create", "картинк", "изображени", "нарисуй"]):
            return IntentClassificationResult(
                intent=Intent.IMAGE_GENERATION,
                data_mode=DataMode.HISTORICAL,
                confidence=0.6,
                reasoning="Fallback: detected image-related keywords"
            )
        elif any(word in query_lower for word in ["search", "find", "news", "latest", "поиск", "найди", "новости"]):
            return IntentClassificationResult(
                intent=Intent.FACTUAL_SEARCH,
                data_mode=DataMode.REALTIME,
                confidence=0.6,
                reasoning="Fallback: detected search-related keywords"
            )
        elif any(word in query_lower for word in ["http", "www", "site", "website", "сайт"]):
            return IntentClassificationResult(
                intent=Intent.WEB_CRAWLING,
                data_mode=DataMode.REALTIME,
                confidence=0.6,
                reasoning="Fallback: detected URL or website reference"
            )
        elif any(word in query_lower for word in ["execute", "run", "code", "python", "выполни", "код"]):
            return IntentClassificationResult(
                intent=Intent.CODE_EXECUTION,
                data_mode=DataMode.HISTORICAL,
                confidence=0.6,
                reasoning="Fallback: detected code execution keywords"
            )
        else:
            return IntentClassificationResult(
                intent=Intent.GENERAL_CHAT,
                data_mode=DataMode.HISTORICAL,
                confidence=0.5,
                reasoning="Fallback: default general chat classification"
            )
    
    def classify_query(self, query: str) -> IntentClassificationResult:
        """
        Classify user query using LLM with structured output.

        Args:
            query: User query to classify

        Returns:
            IntentClassificationResult with intent, data_mode, confidence, and reasoning
        """
        if not query or not query.strip():
            return IntentClassificationResult(
                intent=Intent.GENERAL_CHAT,
                data_mode=DataMode.HISTORICAL,
                confidence=1.0,
                reasoning="Empty query defaults to general chat"
            )

        # Use LLM for classification
        result = self._classify_with_llm(query.strip())

        logger.info(
            f"Query classified: '{query}' -> {result.intent.value} "
            f"({result.data_mode.value}) with confidence {result.confidence:.2f}. "
            f"Reasoning: {result.reasoning}"
        )

        return result
    
    def classify(self, state: AgentState) -> AgentState:
        """
        Classify intent and data mode for the given agent state.

        Args:
            state: Current agent state with query

        Returns:
            Updated state with classification results
        """
        try:
            # Classify the query
            classification_result = self.classify_query(state.query)

            # Update state with classification results
            return state.model_copy(update={
                "intent": classification_result.intent,
                "data_mode": classification_result.data_mode,
                "metadata": {
                    **state.metadata,
                    "classification_timestamp": state.now,
                    "classifier_version": "llm_v2.0",
                    "classification_confidence": classification_result.confidence,
                    "classification_reasoning": classification_result.reasoning
                }
            })

        except Exception as e:
            logger.error(f"Error in intent classification: {e}", exc_info=True)
            return state.model_copy(update={
                "error": f"Classification error: {str(e)}"
            })


# Global classifier instance
intent_classifier = LLMIntentClassifier()


# Backward compatibility
class IntentClassifier(LLMIntentClassifier):
    """Backward compatibility alias."""
    pass
