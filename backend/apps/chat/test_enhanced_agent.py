#!/usr/bin/env python3
"""
Test script for the enhanced chat agent architecture.

This script allows testing the new LangGraph-based chat agent
without running the full Django application.
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

from apps.chat.agent import EnhancedChatAgent
from apps.chat.types.types import AgentState, Intent, DataMode

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_agent_basic():
    """Test basic agent functionality."""
    print("🧪 Testing Enhanced Chat Agent - Basic Functionality")
    print("=" * 60)
    
    # Initialize agent
    agent = EnhancedChatAgent(user_id="test_user", session_id="test_session")
    
    # Test queries
    test_queries = [
        "Hello, how are you?",
        "What time is it?",
        "Generate an image of a sunset",
        "Search for latest AI news",
        "Execute: print('Hello World')",
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n📝 Test {i}: {query}")
        print("-" * 40)
        
        try:
            response = await agent.process_message(query)
            
            if response["success"]:
                print("✅ Success!")
                for msg in response["response"]:
                    print(f"🤖 {msg['content'][:200]}...")
                    if msg.get('metadata'):
                        print(f"📊 Metadata: {msg['metadata']}")
            else:
                print(f"❌ Error: {response.get('error')}")
                
        except Exception as e:
            print(f"💥 Exception: {e}")
        
        print()


async def test_intent_classification():
    """Test intent classification."""
    print("🎯 Testing Intent Classification")
    print("=" * 60)
    
    from apps.chat.classifiers.intent_classifier import intent_classifier
    from apps.chat.types.types import AgentState
    
    test_cases = [
        ("Hello there!", Intent.GENERAL_CHAT),
        ("Create an image of a cat", Intent.IMAGE_GENERATION),
        ("Search for Python tutorials", Intent.FACTUAL_SEARCH),
        ("What's on this website: https://example.com", Intent.WEB_CRAWLING),
        ("Execute this code: print('test')", Intent.CODE_EXECUTION),
        ("Read file data.txt", Intent.FILE_READ),
        ("What time is it?", Intent.DATETIME),
    ]
    
    for query, expected_intent in test_cases:
        state = AgentState(query=query)
        classified_state = intent_classifier.classify(state)
        
        result = "✅" if classified_state.intent == expected_intent else "❌"
        print(f"{result} '{query}' -> {classified_state.intent.value} (expected: {expected_intent.value})")


def test_graph_structure():
    """Test graph structure and compilation."""
    print("🕸️ Testing Graph Structure")
    print("=" * 60)
    
    try:
        from apps.chat.graph import create_enhanced_agent_graph
        
        print("Creating enhanced agent graph...")
        graph = create_enhanced_agent_graph()
        
        print("✅ Graph created successfully!")
        print(f"📊 Graph compiled: {graph._compiled_graph is not None}")
        
        # Test with simple state
        test_state = AgentState(query="Hello world")
        print(f"🧪 Testing with query: '{test_state.query}'")
        
        result_state = graph.invoke(test_state)
        print(f"✅ Graph execution completed!")
        print(f"📝 Result: {result_state.result[:100] if result_state.result else 'No result'}...")
        print(f"🎯 Intent: {result_state.intent}")
        print(f"❌ Error: {result_state.error if result_state.has_error() else 'None'}")
        
    except Exception as e:
        print(f"💥 Graph test failed: {e}")
        import traceback
        traceback.print_exc()


async def interactive_test():
    """Interactive testing mode."""
    print("🎮 Interactive Testing Mode")
    print("=" * 60)
    print("Type your messages to test the agent. Type 'quit' to exit.")
    print()
    
    agent = EnhancedChatAgent(user_id="interactive_user")
    
    while True:
        try:
            query = input("You: ").strip()
            
            if query.lower() in ['quit', 'exit', 'q']:
                break
            
            if not query:
                continue
            
            print("🤖 Processing...")
            response = await agent.process_message(query)
            
            if response["success"]:
                for msg in response["response"]:
                    print(f"Bot: {msg['content']}")
            else:
                print(f"Error: {response.get('error')}")
            
            print()
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")
    
    print("👋 Goodbye!")


async def main():
    """Main test function."""
    print("🚀 Enhanced Chat Agent Test Suite")
    print("=" * 60)
    
    # Run tests
    try:
        print("1. Testing graph structure...")
        test_graph_structure()
        
        print("\n2. Testing intent classification...")
        await test_intent_classification()
        
        print("\n3. Testing basic agent functionality...")
        await test_agent_basic()
        
        print("\n4. Starting interactive mode...")
        await interactive_test()
        
    except Exception as e:
        print(f"💥 Test suite failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
