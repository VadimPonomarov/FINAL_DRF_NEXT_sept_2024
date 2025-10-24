"""
LangChain-based intent classifier with structured output parsing.
"""

import logging
from typing import Optional

import g4f
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate
from pydantic import BaseModel, Field

from apps.chat.types.types import AgentState, DataMode, Intent

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
        self.classification_examples = self._build_classification_examples()
        self.parser = PydanticOutputParser(pydantic_object=IntentClassificationResult)
        self.prompt = self._create_prompt_template()
        self.chain = self._create_classification_chain()

    def _build_classification_examples(self) -> str:
        """Build comprehensive examples for few-shot learning."""
        examples = []

        # FACTUAL_SEARCH + REALTIME examples (current information)
        realtime_examples = [
            ("кто президент сша на сегодня", "Current political figures require up-to-date information"),
            ("who is the current president of the united states", "Questions about active leaders"),
            ("who is the president of usa", "Current US president information"),
            ("who is president of united states", "Current US political leadership"),
            ("current president usa", "Current US president"),
            ("who is the president of the united states right now", "Current US president"),
            ("какие последние новости в мире", "Recent news and developments"),
            ("what are the recent political developments", "Current events and changes"),
            ("кто выиграл последние выборы в США", "Recent elections and appointments"),
            ("who won the recent US elections", "Political changes and outcomes"),
            ("кто является текущим президентом Украины", "Current government positions"),
            ("what is the current stock price of Apple", "Real-time market data"),
            ("current weather in New York", "Live conditions and updates"),
            ("what is happening now", "Current events and real-time updates"),
            ("who is the current CEO of Google", "Current business leadership"),
            ("latest sports scores", "Live sports information"),
            ("who is president of russia", "Current Russian president"),
            ("who is president of ukraine", "Current Ukrainian president"),
            ("who is president of germany", "Current German president"),
            ("who is president of france", "Current French president"),
            ("who is prime minister of uk", "Current UK prime minister"),
            ("who is chancellor of germany", "Current German chancellor"),
            ("найди информацию в Wikipedia о квантовой физике", "Wikipedia factual search"),
            ("search Wikipedia for quantum physics", "Wikipedia knowledge retrieval"),
            ("расскажи о квантовой физике из Wikipedia", "Wikipedia information requests"),
            ("tell me about quantum mechanics from Wikipedia", "Wikipedia educational content"),
            ("что говорит Wikipedia о машинном обучении", "Wikipedia reference queries")
        ]

        examples.append("FACTUAL_SEARCH + REALTIME (current information needed):")
        for query, explanation in realtime_examples:
            examples.append(f"- \"{query}\" → {explanation}")

        # GENERAL_CHAT + HISTORICAL examples (general knowledge)
        general_examples = [
            ("привет как дела", "Casual conversation and greetings"),
            ("hello how are you", "Social interaction"),
            ("расскажи о погоде", "General questions without time sensitivity"),
            ("tell me a joke", "Entertainment and casual talk"),
            ("как приготовить борщ", "Instructions and recipes"),
            ("how to cook borscht", "General knowledge and procedures"),
            ("что такое машинное обучение", "Educational content and explanations"),
            ("what is machine learning", "Conceptual understanding"),
            ("explain quantum physics", "Theoretical knowledge"),
            ("how does photosynthesis work", "Scientific explanations")
        ]

        examples.append("\nGENERAL_CHAT + HISTORICAL (general knowledge):")
        for query, explanation in general_examples:
            examples.append(f"- \"{query}\" → {explanation}")

        # MATHEMATICS examples
        math_examples = [
            ("сколько будет 2+2", "Mathematical calculations"),
            ("what is 15 * 23", "Arithmetic operations"),
            ("вычисли квадратный корень из 144", "Mathematical functions"),
            ("calculate the square root of 144", "Numerical computations"),
            ("реши уравнение x^2 = 16", "Equations and problem solving"),
            ("what is 2 to the power of 8", "Exponents and powers")
        ]

        examples.append("\nMATHEMATICS + HISTORICAL (calculations and equations):")
        for query, explanation in math_examples:
            examples.append(f"- \"{query}\" → {explanation}")

        # Creative and generation examples
        creative_examples = [
            ("нарисуй красивый пейзаж", "Creative image requests"),
            ("draw a beautiful landscape", "Visual content creation"),
            ("создай изображение кота в шляпе", "Imaginative artwork"),
            ("create an image of a cat in a hat", "Artistic generation"),
            ("создай портрет кота в стиле карикатура", "Portrait generation"),
            ("create portrait Donald Trump caricature style", "Celebrity portrait requests"),
            ("нарисуй портрет трампа", "Portrait drawing requests"),
            ("draw a portrait of", "Portrait creation"),
            ("создай картинку", "Image creation requests"),
            ("generate an image", "Image generation"),
            ("сгенерируй изображение", "Image synthesis"),
            ("make a picture", "Picture creation"),
            ("напиши стихотворение о море", "Creative TEXT writing - not image"),
            ("write a poem about the ocean", "Literary TEXT creation - not image")
        ]

        examples.append("\nIMAGE_GENERATION + HISTORICAL (creative visualization - NOT text):")
        for query, explanation in creative_examples:
            examples.append(f"- \"{query}\" → {explanation}")

        # Technical examples
        technical_examples = [
            ("выполни этот код на python", "Running specific code"),
            ("execute this python script", "Code execution requests"),
            ("запустить программу на JavaScript", "Programming language tasks"),
            ("debug this function", "Code analysis and debugging")
        ]

        examples.append("\nCODE_EXECUTION + HISTORICAL (programming tasks):")
        for query, explanation in technical_examples:
            examples.append(f"- \"{query}\" → {explanation}")

        # Time examples
        time_examples = [
            ("который час сейчас", "Current time requests"),
            ("what time is it now", "Live temporal information"),
            ("какое сегодня число", "Current date queries"),
            ("what day is it", "Current day information")
        ]

        examples.append("\nDATETIME + REALTIME (time-sensitive):")
        for query, explanation in time_examples:
            examples.append(f"- \"{query}\" → {explanation}")

        # WEB_CRAWLING examples (parsing, scraping, extracting structured data)
        crawling_examples = [
            ("спарси курсы валют с сайта", "Parsing structured data from websites"),
            ("parse currency rates from website", "Extracting specific data structures"),
            ("спарсить цены с https://example.com", "Scraping prices and tabular data"),
            ("извлеки таблицу с этого сайта", "Table extraction requests"),
            ("get data from this website", "Generic data extraction"),
            ("crawl this site and extract prices", "Price scraping"),
            ("собери информацию с сайта", "Website data collection"),
            ("найди на сайте курсы валют", "Finding specific data on pages"),
            ("extract table from URL", "Structured data extraction"),
            ("какие цены на https://example.com", "Price information requests"),
            ("покажи данные с сайта в виде таблицы", "Table formatting requests"),
            ("parse https://bank.gov.ua/NBUStatService", "API/data endpoint parsing")
        ]

        examples.append("\nWEB_CRAWLING + REALTIME (web scraping and data extraction):")
        for query, explanation in crawling_examples:
            examples.append(f"- \"{query}\" → {explanation}")

        return '\n'.join(examples)

    def add_classification_example(self, query: str, intent: Intent, data_mode: DataMode, explanation: str):
        """Add new example to improve future classifications."""
        # Rebuild examples with the new addition
        self.classification_examples = self._build_classification_examples()

        # Log the new learning
        logger.info(f"Added new classification example: '{query}' → {intent.value} + {data_mode.value} ({explanation})")

    def get_classification_patterns(self) -> dict:
        """Get current classification patterns for analysis."""
        return {
            "examples_count": len(self.classification_examples.split('\n')),
            "fallback_rules": [
                "Current state questions (president + today/current) → FACTUAL_SEARCH + REALTIME",
                "Mathematical expressions (operators + numbers) → MATHEMATICS + HISTORICAL",
                "Time questions (today, now, current) → DATETIME + REALTIME",
                "General conversation patterns → GENERAL_CHAT + HISTORICAL"
            ]
        }
    
    def _create_prompt_template(self) -> PromptTemplate:
        """Create prompt template for intent classification."""

        intent_descriptions = {
            Intent.GENERAL_CHAT: "General conversation, greetings, casual questions, or requests that don't fit other categories",
            Intent.TEXT_GENERATION: "Requests for creative writing, text generation, or content creation",
            Intent.IMAGE_GENERATION: "Requests to create, generate, draw, or produce images, pictures, or visual content",
            Intent.FACTUAL_SEARCH: "Questions about current events, recent information, or requests to search for factual data",
            Intent.WEB_CRAWLING: "Requests to analyze, extract, or get information from specific websites or URLs",
            Intent.CODE_EXECUTION: "Requests to run, execute, or test code",
            Intent.DATA_ANALYSIS: "Requests to analyze data, create charts, graphs, or perform statistical analysis",
            Intent.FILE_READ: "Requests to read, open, or view file contents",
            Intent.FILE_WRITE: "Requests to save, write, or create files",
            Intent.FILE_ANALYSIS: "Requests to analyze, review, or examine file contents",
            Intent.DATETIME: "Questions about current time, date, or temporal information",
            Intent.MATHEMATICS: "Mathematical calculations, equations, expressions, or numerical problems"
        }
        
        data_mode_descriptions = {
            DataMode.HISTORICAL: "Use trained knowledge and historical data",
            DataMode.REALTIME: "Requires current, up-to-date, or real-time information"
        }
        
        template = f"""You are an expert intent classifier for a multi-modal AI assistant.
Your task is to analyze user queries and classify them into the appropriate intent and data mode.

CLASSIFICATION EXAMPLES (use these patterns to understand context):

{self.classification_examples}

CLASSIFICATION GUIDELINES:
1. Analyze the query context and semantic meaning, not just keywords
2. Consider what type of information would best answer the query
3. Determine if the information needs to be current/real-time or historical/general
4. Use the examples above as patterns for understanding query types
5. When in doubt, prefer REALTIME for questions about current states, people, or events
6. Look for semantic patterns: questions about "who is" + current status usually need REALTIME
7. Questions about "what happened" + recent timeframes usually need REALTIME
8. Creative requests (draw, create, write) are usually HISTORICAL
9. Mathematical calculations are always HISTORICAL
10. Learn from the patterns shown in the examples above

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
            from langchain.runnables import RunnableLambda

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
        """Minimal semantic fallback when LLM classification fails completely."""
        query = inputs["query"].lower().strip()
        # Only basic semantic pattern recognition (no rigid keywords)

        # 1. Current events/political queries (REALTIME needed) - CHECK FIRST
        current_state_patterns = [
            # Leadership and political positions (current state questions)
            (any(word in query for word in ['president', 'президент', 'leader', 'лидер', 'minister', 'министр', 'prime minister', 'премьер']) and
             any(word in query for word in ['who is', 'кто является', 'кто есть', 'who are', 'current', 'текущий', 'now', 'сейчас', 'today', 'сегодня', 'right now', 'сейчас'])),
            # Recent events (what happened recently)
            (any(word in query for word in ['won', 'выиграл', 'became', 'стал', 'happened', 'произошло', 'elected', 'избран', 'appointed', 'назначен']) and
             any(word in query for word in ['recent', 'недавно', 'latest', 'последние', 'recently', 'недавнее'])),
            # Status questions (what is the current state)
            (query.startswith(('what is', 'что такое', 'какой', 'which', 'what are')) and
             any(word in query for word in ['current', 'текущий', 'now', 'сейчас', 'today', 'сегодня', 'latest', 'последние'])),
            # Direct current state questions
            (any(word in query for word in ['president', 'президент']) and
             any(word in query for word in ['сша', 'usa', 'russia', 'россии', 'украины', 'ukraine', 'германии', 'germany', 'франции', 'france', 'британии', 'uk']) and
             any(word in query for word in ['today', 'сегодня', 'current', 'текущий', 'now', 'сейчас'])),
            # Simple president queries
            (any(word in query for word in ['president', 'президент']) and
             any(word in query for word in ['usa', 'сша', 'america', 'америки', 'russia', 'россии', 'ukraine', 'украины', 'germany', 'германии', 'france', 'франции'])),
            # Current leadership queries
            (any(word in query for word in ['who is', 'кто']) and
             any(word in query for word in ['president', 'президент', 'minister', 'министр', 'chancellor', 'канцлер', 'prime minister', 'премьер']) and
             any(word in query for word in ['usa', 'сша', 'russia', 'россии', 'ukraine', 'украины', 'germany', 'германии', 'france', 'франции', 'uk', 'британии']))
        ]

        if any(current_state_patterns):
            return IntentClassificationResult(
                intent=Intent.FACTUAL_SEARCH,
                data_mode=DataMode.REALTIME,
                confidence=0.7,
                reasoning="Fallback: current state/event pattern detected"
            )

        # 2. Web crawling requests
        web_crawling_patterns = [
            # Explicit crawling words + URL indicators
            any(word in query for word in ['parse', 'парсинг', 'парсь', 'спарсь', 'crawl', 'скрапинг', 'extract', 'извлечь', 'analyze', 'анализ']) and
            any(word in query for word in ['website', 'сайт', 'url', 'page', 'страница', 'http', 'https']),
            # Direct URL patterns (any http/https link)
            'http://' in query or 'https://' in query,
            # Explicit crawling commands
            query.startswith(('parse this', 'парсинг этого', 'crawl this', 'скрапинг этого', 'спарсь', 'парсь')),
            'parse this website:' in query or 'парсинг этого сайта:' in query
        ]
        
        if any(web_crawling_patterns):
            return IntentClassificationResult(
                intent=Intent.WEB_CRAWLING,
                data_mode=DataMode.REALTIME,
                confidence=0.8,
                reasoning="Fallback: web crawling pattern detected"
            )

        # 3. Image generation requests
        query_words = query.split()
        image_generation_patterns = [
            # Команды рисования САМИ по себе указывают на генерацию изображений
            any(word in query_words for word in ['нарисуй', 'нарисовать', 'draw', 'сгенерируй', 'сгенерировать']),
            # Команды создания + слово про изображение
            any(word in query for word in ['generate', 'создать', 'create', 'создай', 'make', 'сделать', 'сделай']) and
            any(word in query for word in ['image', 'изображение', 'picture', 'картинку', 'картинка', 'photo', 'фото', 'art', 'искусство', 'drawing', 'рисунок', 'портрет', 'portrait']),
            # Стартует с команды генерации
            query.startswith(('generate an image', 'создать изображение', 'draw a', 'draw ', 'нарисовать', 'нарисуй', 'create a picture', 'создать картинку', 'создай портрет', 'сгенерируй')),
            # Содержит явные слова про изображение
            'image of' in query or 'изображение' in query or 'портрет' in query
        ]
        
        if any(image_generation_patterns):
            return IntentClassificationResult(
                intent=Intent.IMAGE_GENERATION,
                data_mode=DataMode.HISTORICAL,
                confidence=0.8,
                reasoning="Fallback: image generation pattern detected"
            )

        # 4. Mathematical expressions (highest priority for math)
        if any(char in query for char in ['+', '-', '*', '/', '=', '^', '√', '(', ')']) and any(char.isdigit() for char in query):
            return IntentClassificationResult(
                intent=Intent.MATHEMATICS,
                data_mode=DataMode.HISTORICAL,
                confidence=0.9,
                reasoning="Fallback: mathematical expression pattern detected"
            )

        # 5. Default fallback - general chat
        return IntentClassificationResult(
            intent=Intent.GENERAL_CHAT,
            data_mode=DataMode.HISTORICAL,
            confidence=0.5,
            reasoning="Fallback: no specific pattern detected"
        )

    def classify_query(self, query: str) -> IntentClassificationResult:
        """
        Classify user query using LangChain with structured output and example-based learning.

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
            # Try LangChain classification with examples first
            result = self.chain.invoke({"query": query.strip()})

            # Check if result is valid
            if result is None:
                logger.warning("Chain returned None, using fallback")
                # Use semantic fallback
                return self._fallback_chain({"query": query})

            logger.info(
                f"LLM classification: '{query}' -> {result.intent.value} "
                f"({result.data_mode.value}) with confidence {result.confidence:.2f}. "
                f"Reasoning: {result.reasoning}"
            )

            # Log successful classification for learning analysis
            if result.confidence > 0.8:
                logger.debug(f"High confidence classification: {query} -> {result.intent.value}")

            return result

        except Exception as e:
            logger.warning(f"LangChain classification failed: {e}, using semantic fallback")
            # Use semantic fallback
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

            # Check if classification result is valid
            if classification_result is None:
                logger.warning("Classification returned None, using fallback")
                classification_result = IntentClassificationResult(
                    intent=Intent.GENERAL_CHAT,
                    data_mode=DataMode.HISTORICAL,
                    confidence=0.5,
                    reasoning="Fallback: classification returned None"
                )

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
