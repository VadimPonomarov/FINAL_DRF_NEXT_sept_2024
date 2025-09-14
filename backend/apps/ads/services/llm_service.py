"""
LLM Service for generating car advertisement content.
Uses g4f (GPT4Free) for content generation.
"""
import json
import logging
from typing import Dict, Optional
import g4f
from g4f.client import Client

logger = logging.getLogger(__name__)


class LLMService:
    """Service for LLM-based content generation."""
    
    @classmethod
    def generate_content(cls, prompt: str, max_retries: int = 3) -> Optional[Dict]:
        """
        Generate content using LLM with fallback providers.
        
        Args:
            prompt: The prompt for content generation
            max_retries: Maximum number of retry attempts
            
        Returns:
            Dict with generated content or None if failed
        """
        providers = [
            g4f.Provider.Bing,
            g4f.Provider.ChatgptAi,
            g4f.Provider.FreeGpt,
            g4f.Provider.Liaobots
        ]
        
        for attempt in range(max_retries):
            for provider in providers:
                try:
                    logger.info(f"Attempting content generation with {provider.__name__} (attempt {attempt + 1})")
                    
                    client = Client(provider=provider)
                    
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {
                                "role": "system", 
                                "content": "You are a professional car advertisement writer. Generate realistic and appealing car ads in Ukrainian language. Always respond with valid JSON format."
                            },
                            {
                                "role": "user", 
                                "content": prompt
                            }
                        ],
                        max_tokens=500,
                        temperature=0.7
                    )
                    
                    content = response.choices[0].message.content
                    
                    # Try to parse JSON response
                    try:
                        result = json.loads(content)
                        if isinstance(result, dict) and 'title' in result and 'description' in result:
                            logger.info(f"Successfully generated content with {provider.__name__}")
                            return result
                    except json.JSONDecodeError:
                        # Try to extract JSON from response
                        result = cls._extract_json_from_text(content)
                        if result:
                            logger.info(f"Successfully extracted JSON content with {provider.__name__}")
                            return result
                    
                except Exception as e:
                    logger.warning(f"Failed to generate content with {provider.__name__}: {str(e)}")
                    continue
        
        logger.error("All LLM providers failed to generate content")
        return None
    
    @classmethod
    def _extract_json_from_text(cls, text: str) -> Optional[Dict]:
        """
        Extract JSON from text response.
        
        Args:
            text: Text that may contain JSON
            
        Returns:
            Extracted JSON dict or None
        """
        try:
            # Find JSON-like content between braces
            start = text.find('{')
            end = text.rfind('}') + 1
            
            if start != -1 and end > start:
                json_str = text[start:end]
                result = json.loads(json_str)
                
                if isinstance(result, dict) and 'title' in result and 'description' in result:
                    return result
        except:
            pass
        
        return None
    
    @classmethod
    def generate_car_ad_content(cls, mark: str, model: str, year: int, specs: Dict) -> Dict:
        """
        Generate car advertisement content with specific format.
        
        Args:
            mark: Car brand
            model: Car model
            year: Car year
            specs: Car specifications dict
            
        Returns:
            Dict with title and description
        """
        prompt = f"""
        Створи реалістичне оголошення про продаж автомобіля {mark} {model} {year} року з наступними характеристиками:
        
        Технічні дані:
        - Пробіг: {specs.get('mileage', 0)} км
        - Двигун: {specs.get('engine_volume', 2.0)}л, {specs.get('engine_power', 150)} к.с.
        - Паливо: {specs.get('fuel_type', 'petrol')}
        - Коробка передач: {specs.get('transmission', 'automatic')}
        - Колір: {specs.get('color', 'black')}
        - Стан: {specs.get('condition', 'good')}
        - Ціна: ${specs.get('price', 25000)}
        
        Потрібно створити:
        1. Привабливий заголовок (максимум 80 символів)
        2. Детальний опис (100-300 слів) українською мовою
        
        Відповідь у форматі JSON:
        {{
            "title": "заголовок оголошення",
            "description": "детальний опис автомобіля з технічними характеристиками та перевагами"
        }}
        """
        
        result = cls.generate_content(prompt)
        
        if result:
            return result
        else:
            # Fallback generation
            return cls._generate_fallback_content(mark, model, year, specs)
    
    @classmethod
    def _generate_fallback_content(cls, mark: str, model: str, year: int, specs: Dict) -> Dict:
        """
        Fallback content generation without LLM.
        
        Args:
            mark: Car brand
            model: Car model  
            year: Car year
            specs: Car specifications
            
        Returns:
            Dict with title and description
        """
        condition_map = {
            'excellent': 'відмінному',
            'good': 'хорошому',
            'fair': 'задовільному', 
            'needs_work': 'робочому'
        }
        
        fuel_map = {
            'petrol': 'бензин',
            'diesel': 'дизель',
            'hybrid': 'гібрид',
            'electric': 'електро'
        }
        
        transmission_map = {
            'manual': 'механіка',
            'automatic': 'автомат',
            'cvt': 'варіатор'
        }
        
        condition = condition_map.get(specs.get('condition', 'good'), 'хорошому')
        fuel = fuel_map.get(specs.get('fuel_type', 'petrol'), 'бензин')
        transmission = transmission_map.get(specs.get('transmission', 'automatic'), 'автомат')
        
        title = f"{mark} {model} {year} - {specs.get('color', 'чорний')} в {condition} стані"
        
        description = f"""
        Продається {mark} {model} {year} року випуску в {condition} стані.
        
        Технічні характеристики:
        • Пробіг: {specs.get('mileage', 0):,} км
        • Двигун: {specs.get('engine_volume', 2.0)}л, {specs.get('engine_power', 150)} к.с.
        • Паливо: {fuel}
        • Коробка передач: {transmission}
        • Колір: {specs.get('color', 'чорний')}
        • Кількість власників: {specs.get('owners_count', 1)}
        
        Автомобіль в хорошому технічному стані, регулярно обслуговувався.
        Всі документи в порядку. Можливий торг при огляді.
        
        Ціна: ${specs.get('price', 25000):,}
        
        Дзвоніть, пишіть, відповім на всі питання!
        """.strip()
        
        return {
            'title': title[:80],
            'description': description
        }
    
    @classmethod
    def moderate_content(cls, title: str, description: str) -> Dict:
        """
        Moderate content for inappropriate language.
        
        Args:
            title: Advertisement title
            description: Advertisement description
            
        Returns:
            Dict with moderation results
        """
        prompt = f"""
        Перевір наступний текст оголошення на наявність нецензурної лексики, образливих слів або неприйнятного контенту:
        
        Заголовок: {title}
        Опис: {description}
        
        Відповідь у форматі JSON:
        {{
            "is_appropriate": true/false,
            "issues": ["список проблем якщо є"],
            "suggestions": ["пропозиції для виправлення"]
        }}
        """
        
        result = cls.generate_content(prompt)
        
        if result and 'is_appropriate' in result:
            return result
        else:
            # Fallback: simple keyword check
            inappropriate_words = [
                'дурак', 'ідіот', 'придурок', 'лох', 'мудак',
                'блядь', 'сука', 'хуй', 'пизда', 'ебать'
            ]
            
            text_lower = (title + ' ' + description).lower()
            found_issues = [word for word in inappropriate_words if word in text_lower]
            
            return {
                'is_appropriate': len(found_issues) == 0,
                'issues': found_issues,
                'suggestions': ['Замініть неприйнятні слова на більш ввічливі'] if found_issues else []
            }

    @classmethod
    def get_completion(cls, prompt: str, max_retries: int = 3) -> Optional[str]:
        """
        Get simple text completion from LLM.

        Args:
            prompt: The prompt for completion
            max_retries: Maximum number of retry attempts

        Returns:
            Generated text or None if failed
        """
        try:
            client = Client()

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            if hasattr(response, 'choices') and response.choices:
                return response.choices[0].message.content
            else:
                return str(response) if response else None

        except Exception as e:
            logger.error(f"LLM completion error: {e}")
            return None
