"""
LangChain-based intent classifier with structured output parsing.
"""

import logging
from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.runnables import RunnablePassthrough
from apps.chat.types.types import Intent, DataMode, AgentState
import g4f

logger = logging.getLogger(__name__)


class IntentClassificationResult(BaseModel):
    """Pydantic model for intent classification result."""
    
    intent: Intent = Field(..., description="Classified intent type")
    data_mode: DataMode = Field(..., description="Required data mode")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence (0-1)")
    reasoning: str = Field(..., description="Brief explanation of classification decision")


class LangChainIntentClassifier:
    """LangChain-based intent classifier with structured output parsing."""
    
    def __init__(self):
        self.parser = PydanticOutputParser(pydantic_object=IntentClassificationResult)
        self.prompt = self._create_prompt_template()
        self.chain = self._create_classification_chain()
    
    def _create_prompt_template(self) -> PromptTemplate:
        """Create prompt template for intent classification."""
        
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
        
        template = f"""You are an expert intent classifier for a multi-modal AI assistant.
Your task is to analyze user queries and classify them into the appropriate intent and data mode.

AVAILABLE INTENTS:
{chr(10).join(f"- {intent.value}: {desc}" for intent, desc in intent_descriptions.items())}

DATA MODES:
{chr(10).join(f"- {mode.value}: {desc}" for mode, desc in data_mode_descriptions.items())}

CLASSIFICATION RULES:
1. Choose the most specific intent that matches the user's request
2. If the request mentions "current", "latest", "recent", "now", "today", "who is", "who is the", "who currently", "who is currently", or asks about news/events/political figures/leaders, use FACTUAL_SEARCH with REALTIME mode
3. Questions about current presidents, leaders, politicians, elections, or government positions should ALWAYS use FACTUAL_SEARCH with REALTIME mode
4. Examples that require FACTUAL_SEARCH + REALTIME:
   - "Who is the current president of [country]?"
   - "Who is currently the [position]?"
   - "What is the latest news about [topic]?"
   - "Who won the recent election?"
5. If the request is about general knowledge, creative tasks, or doesn't need current data, use HISTORICAL mode
6. Provide a confidence score (0.0-1.0) based on how certain you are about the classification
7. Give a brief reasoning for your decision

{{format_instructions}}

User query: {{query}}"""

        return PromptTemplate(
            template=template,
            input_variables=["query"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()}
        )
    
    def _create_classification_chain(self):
        """Create LangChain classification chain with proper chaining."""
        try:
            from langchain_core.runnables import RunnableLambda
            from langchain_core.output_parsers import PydanticOutputParser

            # Create G4F LLM wrapper
            def g4f_llm(prompt_value):
                """G4F LLM wrapper for LangChain."""
                try:
                    # Extract messages from prompt
                    if hasattr(prompt_value, 'messages'):
                        messages = [
                            {"role": "system", "content": prompt_value.messages[0].content},
                            {"role": "user", "content": prompt_value.messages[1].content}
                        ]
                    else:
                        messages = [{"role": "user", "content": str(prompt_value)}]

                    response = g4f.ChatCompletion.create(
                        model="gpt-4",
                        messages=messages,
                        stream=False
                    )
                    return response
                except Exception as e:
                    logger.error(f"G4F LLM error: {e}")
                    raise

            # Create the chain: prompt -> llm -> parser
            chain = (
                self.prompt
                | RunnableLambda(g4f_llm)
                | self.parser
            )

            return chain

        except Exception as e:
            logger.error(f"Failed to create classification chain: {e}")
            return self._fallback_chain
    
    def _fallback_chain(self, inputs):
        """Fallback classification when main chain fails."""
        query = inputs["query"].lower().strip()

        # Enhanced heuristics for better classification
        # Image generation keywords
        image_keywords = [
            "image", "picture", "draw", "create", "generate", "make", "paint", "sketch",
            "картинк", "изображени", "нарисуй", "создай", "сгенерируй", "портрет"
        ]
        if any(word in query for word in image_keywords):
            return IntentClassificationResult(
                intent=Intent.IMAGE_GENERATION,
                data_mode=DataMode.HISTORICAL,
                confidence=0.8,
                reasoning="Fallback: detected image generation keywords"
            )
        # Enhanced search detection - includes current events, political figures, recent news
        search_keywords = [
            "search", "find", "news", "latest", "current", "now", "today", "recent", "who is", "what is",
            "president", "leader", "election", "party", "government", "minister", "prime minister",
            "поиск", "найди", "новости", "сейчас", "текущий", "кто такой", "кто сейчас", "кто является",
            "президент", "лидер", "выборы", "правительство", "министр", "премьер"
        ]
        
        # Political figures, current events patterns
        political_patterns = [
            "president of", "who is the president", "current president", "acting president",
            "leader of", "current leader", "who leads",
            "кто президент", "кто сейчас президент", "действующий президент", "кто лидер",
            "кто сейчас руководит", "кто является президентом"
        ]
        
        # Check for current events queries (questions about "who", "what", "when" regarding current topics)
        is_current_event_query = (
            any(word in query for word in search_keywords) or
            any(pattern in query.lower() for pattern in political_patterns) or
            (("who" in query.lower() or "кто" in query.lower()) and 
             any(word in query.lower() for word in ["now", "currently", "today", "current", "сейчас", "текущий", "сегодня"]))
        )
        
        if is_current_event_query:
            return IntentClassificationResult(
                intent=Intent.FACTUAL_SEARCH,
                data_mode=DataMode.REALTIME,
                confidence=0.85,
                reasoning="Fallback: detected search-related keywords or current events pattern"
            )
        elif any(word in query for word in ["http", "www", "site", "website", "сайт"]):
            return IntentClassificationResult(
                intent=Intent.WEB_CRAWLING,
                data_mode=DataMode.REALTIME,
                confidence=0.6,
                reasoning="Fallback: detected URL or website reference"
            )
        elif any(word in query for word in ["execute", "run", "code", "python", "выполни", "код"]):
            return IntentClassificationResult(
                intent=Intent.CODE_EXECUTION,
                data_mode=DataMode.HISTORICAL,
                confidence=0.6,
                reasoning="Fallback: detected code execution keywords"
            )
        elif any(word in query for word in ["который час", "сколько время", "какое время", "what time", "какое сегодня число", "какая дата", "what date", "today", "киевскому времени", "kiev time", "kyiv time"]):
            return IntentClassificationResult(
                intent=Intent.DATETIME,
                data_mode=DataMode.REALTIME,
                confidence=0.8,
                reasoning="Fallback: detected datetime-related keywords"
            )
        # File operations - only if specific path mentioned
        elif any(word in query for word in ["file", "файл", "read", "прочитай", "открой"]):
            # Check if there's a specific path or file extension
            path_indicators = ["/", "\\", ".txt", ".py", ".json", ".csv", ".md", "path", "путь"]
            if any(indicator in query for indicator in path_indicators):
                return IntentClassificationResult(
                    intent=Intent.FILE_READ,
                    data_mode=DataMode.HISTORICAL,
                    confidence=0.8,
                    reasoning="Fallback: detected file operation with specific path"
                )
            else:
                # General question about files without specific path
                return IntentClassificationResult(
                    intent=Intent.GENERAL_CHAT,
                    data_mode=DataMode.HISTORICAL,
                    confidence=0.9,
                    reasoning="Fallback: general question about files without specific path"
                )
        else:
            return IntentClassificationResult(
                intent=Intent.GENERAL_CHAT,
                data_mode=DataMode.HISTORICAL,
                confidence=0.9,
                reasoning="Fallback: general conversation"
            )
    
    def classify_query(self, query: str) -> IntentClassificationResult:
        """
        Classify user query using LangChain with structured output.
        
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
        
        try:
            # Try LangChain classification first
            result = self.chain.invoke({"query": query.strip()})

            logger.info(
                f"LangChain classification: '{query}' -> {result.intent.value} "
                f"({result.data_mode.value}) with confidence {result.confidence:.2f}. "
                f"Reasoning: {result.reasoning}"
            )

            return result

        except Exception as e:
            logger.warning(f"LangChain classification failed: {e}, using fallback")
            # Use fallback
            return self._fallback_chain({"query": query})
    
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
                    "classifier_version": "langchain_v1.0",
                    "classification_confidence": classification_result.confidence,
                    "classification_reasoning": classification_result.reasoning
                }
            })
            
        except Exception as e:
            logger.error(f"Error in LangChain intent classification: {e}", exc_info=True)
            return state.model_copy(update={
                "error": f"Classification error: {str(e)}"
            })


# Global LangChain classifier instance
langchain_intent_classifier = LangChainIntentClassifier()


# Export both classifiers for flexibility
__all__ = [
    'IntentClassificationResult',
    'LangChainIntentClassifier', 
    'langchain_intent_classifier'
]
