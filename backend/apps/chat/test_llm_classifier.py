#!/usr/bin/env python3
"""
Test script for the LLM-based intent classifier.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from apps.chat.classifiers.langchain_classifier import langchain_intent_classifier
from apps.chat.types.types import AgentState, Intent, DataMode

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_llm_classifier():
    """Test LLM-based intent classifier."""
    print("🧠 Testing LLM-based Intent Classifier")
    print("=" * 60)
    
    test_cases = [
        # General chat
        ("Hello, how are you?", Intent.GENERAL_CHAT, DataMode.HISTORICAL),
        ("Привет, как дела?", Intent.GENERAL_CHAT, DataMode.HISTORICAL),
        
        # Image generation
        ("Create an image of a sunset", Intent.IMAGE_GENERATION, DataMode.HISTORICAL),
        ("Нарисуй картинку кота", Intent.IMAGE_GENERATION, DataMode.HISTORICAL),
        ("Generate a picture of mountains", Intent.IMAGE_GENERATION, DataMode.HISTORICAL),
        
        # Search queries
        ("What are the latest AI developments?", Intent.FACTUAL_SEARCH, DataMode.REALTIME),
        ("Find current news about technology", Intent.FACTUAL_SEARCH, DataMode.REALTIME),
        ("Найди последние новости", Intent.FACTUAL_SEARCH, DataMode.REALTIME),
        
        # Web crawling
        ("What's on this website: https://example.com", Intent.WEB_CRAWLING, DataMode.REALTIME),
        ("Analyze the content of google.com", Intent.WEB_CRAWLING, DataMode.REALTIME),
        ("Что на сайте yandex.ru?", Intent.WEB_CRAWLING, DataMode.REALTIME),
        
        # Code execution
        ("Execute this code: print('hello')", Intent.CODE_EXECUTION, DataMode.HISTORICAL),
        ("Run: 2 + 2", Intent.CODE_EXECUTION, DataMode.HISTORICAL),
        ("Выполни: import datetime; print(datetime.now())", Intent.CODE_EXECUTION, DataMode.HISTORICAL),
        
        # File operations
        ("Read file data.txt", Intent.FILE_READ, DataMode.HISTORICAL),
        ("Save this to a file", Intent.FILE_WRITE, DataMode.HISTORICAL),
        ("Analyze the contents of report.pdf", Intent.FILE_ANALYSIS, DataMode.HISTORICAL),
        
        # DateTime
        ("What time is it?", Intent.DATETIME, DataMode.REALTIME),
        ("Который час?", Intent.DATETIME, DataMode.REALTIME),
        ("What's today's date?", Intent.DATETIME, DataMode.REALTIME),
    ]
    
    correct_intent = 0
    correct_data_mode = 0
    total_tests = len(test_cases)
    
    print(f"Running {total_tests} test cases...\n")
    
    for i, (query, expected_intent, expected_data_mode) in enumerate(test_cases, 1):
        print(f"Test {i:2d}: {query}")
        print("-" * 50)
        
        try:
            # Create agent state
            state = AgentState(query=query)
            
            # Classify
            result_state = langchain_intent_classifier.classify(state)
            
            # Check results
            intent_correct = result_state.intent == expected_intent
            data_mode_correct = result_state.data_mode == expected_data_mode
            
            if intent_correct:
                correct_intent += 1
            if data_mode_correct:
                correct_data_mode += 1
            
            # Display results
            intent_status = "✅" if intent_correct else "❌"
            data_mode_status = "✅" if data_mode_correct else "❌"
            
            print(f"{intent_status} Intent: {result_state.intent.value} (expected: {expected_intent.value})")
            print(f"{data_mode_status} Data Mode: {result_state.data_mode.value} (expected: {expected_data_mode.value})")
            
            if hasattr(result_state, 'metadata'):
                confidence = result_state.metadata.get('classification_confidence', 'N/A')
                reasoning = result_state.metadata.get('classification_reasoning', 'N/A')
                print(f"📊 Confidence: {confidence}")
                print(f"💭 Reasoning: {reasoning}")
            
            print()
            
        except Exception as e:
            print(f"💥 Error: {e}")
            print()
    
    # Summary
    print("=" * 60)
    print("📊 CLASSIFICATION RESULTS SUMMARY")
    print("=" * 60)
    print(f"Intent Accuracy: {correct_intent}/{total_tests} ({correct_intent/total_tests*100:.1f}%)")
    print(f"Data Mode Accuracy: {correct_data_mode}/{total_tests} ({correct_data_mode/total_tests*100:.1f}%)")
    print(f"Overall Accuracy: {(correct_intent + correct_data_mode)/(total_tests*2)*100:.1f}%")


def test_direct_classification():
    """Test direct classification without agent state."""
    print("\n🎯 Testing Direct Classification")
    print("=" * 60)
    
    test_queries = [
        "Create a beautiful landscape image",
        "What's the weather like today?",
        "Execute: print('Hello World')",
        "Read the contents of config.json"
    ]
    
    for query in test_queries:
        print(f"Query: {query}")
        try:
            result = langchain_intent_classifier.classify_query(query)
            print(f"  Intent: {result.intent.value}")
            print(f"  Data Mode: {result.data_mode.value}")
            print(f"  Confidence: {result.confidence:.2f}")
            print(f"  Reasoning: {result.reasoning}")
        except Exception as e:
            print(f"  Error: {e}")
        print()


def interactive_test():
    """Interactive testing mode."""
    print("\n🎮 Interactive Classification Test")
    print("=" * 60)
    print("Enter queries to test classification. Type 'quit' to exit.")
    print()
    
    while True:
        try:
            query = input("Query: ").strip()
            
            if query.lower() in ['quit', 'exit', 'q']:
                break
            
            if not query:
                continue
            
            result = langchain_intent_classifier.classify_query(query)
            
            print(f"  🎯 Intent: {result.intent.value}")
            print(f"  📊 Data Mode: {result.data_mode.value}")
            print(f"  🎲 Confidence: {result.confidence:.2f}")
            print(f"  💭 Reasoning: {result.reasoning}")
            print()
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"  ❌ Error: {e}")
            print()
    
    print("👋 Goodbye!")


def main():
    """Main test function."""
    print("🚀 LLM Intent Classifier Test Suite")
    print("=" * 60)
    
    try:
        # Run automated tests
        test_llm_classifier()
        
        # Run direct classification tests
        test_direct_classification()
        
        # Interactive mode
        interactive_test()
        
    except Exception as e:
        print(f"💥 Test suite failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
