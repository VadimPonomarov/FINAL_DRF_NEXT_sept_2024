#!/usr/bin/env python3
"""
Test script for WebSocket consumer and chat functionality.
Emulates real chat interactions.
"""

import os
import sys
import asyncio
import json
import logging
from pathlib import Path
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

# Add the backend directory to Python path
backend_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_root))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from apps.chat.consumer import EnhancedChatConsumer
from apps.chat.agent import EnhancedChatAgent
from django.contrib.auth import get_user_model

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

User = get_user_model()


class MockWebSocketScope:
    """Mock WebSocket scope for testing."""
    
    def __init__(self, user=None, query_string=""):
        self.user = user
        self.query_string = query_string.encode('utf-8')
        self.client = ["127.0.0.1", 12345]
    
    def get(self, key, default=None):
        if key == "user":
            return self.user
        elif key == "query_string":
            return self.query_string
        elif key == "client":
            return self.client
        return default


class MockWebSocket:
    """Mock WebSocket for testing consumer."""
    
    def __init__(self):
        self.messages_sent = []
        self.is_connected = False
        self.close_code = None
    
    async def accept(self):
        self.is_connected = True
        print("🔗 WebSocket connection accepted")
    
    async def send(self, text_data=None, bytes_data=None):
        if text_data:
            message = json.loads(text_data)
            self.messages_sent.append(message)
            print(f"📤 Sent: {message}")
    
    async def close(self, code=1000):
        self.is_connected = False
        self.close_code = code
        print(f"❌ WebSocket closed with code: {code}")


async def test_consumer_lifecycle():
    """Test consumer connection lifecycle."""
    print("🔄 Testing Consumer Lifecycle")
    print("=" * 60)
    
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 123
    mock_user.email = "test@example.com"
    mock_user.is_authenticated = True
    
    # Create consumer
    consumer = EnhancedChatConsumer()
    consumer.scope = MockWebSocketScope(user=mock_user)
    
    # Mock WebSocket methods properly
    consumer.accept = AsyncMock()
    consumer.send = AsyncMock()  # Mock the send method instead of send_json
    consumer.close = AsyncMock()
    consumer.base_send = AsyncMock()  # Add the missing base_send attribute
    
    try:
        # Test connection
        print("1. Testing connection...")
        await consumer.connect()
        
        print("✅ Connection successful")
        print(f"   User: {consumer.user.email}")
        print(f"   Session ID: {consumer.session_id}")
        print(f"   Agent initialized: {consumer.agent is not None}")
        
        # Test disconnection
        print("\n2. Testing disconnection...")
        await consumer.disconnect(1000)
        print("✅ Disconnection successful")
        
    except Exception as e:
        print(f"❌ Lifecycle test failed: {e}")
        import traceback
        traceback.print_exc()


async def test_message_processing():
    """Test message processing through consumer."""
    print("\n💬 Testing Message Processing")
    print("=" * 60)
    
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 456
    mock_user.email = "chat@example.com"
    mock_user.is_authenticated = True
    
    # Create consumer
    consumer = EnhancedChatConsumer()
    consumer.scope = MockWebSocketScope(user=mock_user)
    
    # Mock WebSocket methods
    consumer.accept = AsyncMock()
    consumer.send_json = AsyncMock()
    consumer.close = AsyncMock()
    
    # Connect first
    await consumer.connect()
    
    # Test messages
    test_messages = [
        {
            "type": "chat",
            "message": "Hello, how are you?",
            "echo": False
        },
        {
            "type": "chat", 
            "message": "Create an image of a sunset",
            "echo": False
        },
        {
            "type": "chat",
            "message": "What's the latest news about AI?",
            "echo": False
        },
        {
            "type": "ping"
        },
        {
            "type": "chat_history"
        }
    ]
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n{i}. Processing message: {message}")
        print("-" * 40)
        
        try:
            # Send message to consumer
            await consumer.receive(json.dumps(message))
            
            # Check if send_json was called
            if consumer.send_json.called:
                print("✅ Response sent successfully")
                # Print last call arguments
                last_call = consumer.send_json.call_args_list[-1]
                if last_call:
                    response = last_call[0][0]  # First argument
                    print(f"📝 Response type: {response.get('type')}")
                    if 'message' in response:
                        print(f"📝 Response content: {response['message'][:100]}...")
            else:
                print("⚠️ No response sent")
                
        except Exception as e:
            print(f"❌ Message processing failed: {e}")
            import traceback
            traceback.print_exc()


async def test_agent_integration():
    """Test direct agent integration."""
    print("\n🤖 Testing Agent Integration")
    print("=" * 60)
    
    try:
        # Create agent
        agent = EnhancedChatAgent(user_id="test_user_789")
        
        test_queries = [
            "Hello there!",
            "Generate an image of a cat",
            "What time is it?",
            "Execute: print('Hello World')",
            "Search for Python tutorials"
        ]
        
        for i, query in enumerate(test_queries, 1):
            print(f"\n{i}. Testing query: '{query}'")
            print("-" * 40)
            
            try:
                response = await agent.process_message(query)
                
                if response["success"]:
                    print("✅ Processing successful")
                    for msg in response["response"]:
                        print(f"🤖 Response: {msg['content'][:150]}...")
                        if msg.get('metadata'):
                            intent = msg['metadata'].get('intent')
                            processing_time = msg['metadata'].get('processing_time')
                            print(f"📊 Intent: {intent}, Time: {processing_time}ms")
                else:
                    print(f"❌ Processing failed: {response.get('error')}")
                    
            except Exception as e:
                print(f"💥 Agent error: {e}")
        
        # Test chat history
        print(f"\n📚 Chat history length: {len(agent.get_chat_history())}")
        
    except Exception as e:
        print(f"❌ Agent integration test failed: {e}")
        import traceback
        traceback.print_exc()


async def simulate_real_chat():
    """Simulate a real chat conversation."""
    print("\n🎭 Simulating Real Chat Conversation")
    print("=" * 60)
    
    # Create mock user
    mock_user = MagicMock()
    mock_user.id = 999
    mock_user.email = "realchat@example.com"
    mock_user.first_name = "Test"
    mock_user.is_authenticated = True
    
    # Create consumer
    consumer = EnhancedChatConsumer()
    consumer.scope = MockWebSocketScope(user=mock_user)
    
    # Track all messages
    sent_messages = []
    
    async def mock_send_json(data):
        sent_messages.append(data)
        print(f"🤖 Bot: {data.get('message', data.get('type', 'Unknown'))}")
    
    consumer.send_json = mock_send_json
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()
    
    # Start conversation
    await consumer.connect()
    
    # Simulate conversation
    conversation = [
        "Hi there!",
        "How are you doing today?",
        "Can you create an image of a beautiful mountain landscape?",
        "What's the weather like today?",
        "Execute this code: print('Hello from Python!')",
        "Thanks for your help!"
    ]
    
    print("\n🗣️ Starting conversation...")
    print("=" * 40)
    
    for i, user_message in enumerate(conversation, 1):
        print(f"\n👤 User: {user_message}")
        
        # Send message
        message_data = {
            "type": "chat",
            "message": user_message,
            "echo": False
        }
        
        try:
            await consumer.receive(json.dumps(message_data))
            # Small delay to simulate real conversation
            await asyncio.sleep(0.5)
        except Exception as e:
            print(f"❌ Error processing message: {e}")
    
    print(f"\n📊 Conversation Summary:")
    print(f"   Messages sent by user: {len(conversation)}")
    print(f"   Messages sent by bot: {len(sent_messages)}")
    print(f"   Session ID: {consumer.session_id}")
    
    # Disconnect
    await consumer.disconnect(1000)


async def test_error_handling():
    """Test error handling scenarios."""
    print("\n🚨 Testing Error Handling")
    print("=" * 60)
    
    consumer = EnhancedChatConsumer()
    consumer.scope = MockWebSocketScope()  # No user
    
    error_messages = []
    
    async def mock_send_json(data):
        error_messages.append(data)
        if data.get('type') == 'error':
            print(f"❌ Error caught: {data.get('message')}")
    
    consumer.send_json = mock_send_json
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()
    
    # Test scenarios
    test_cases = [
        ("Invalid JSON", "invalid json"),
        ("Empty message", '{"type": "chat", "message": ""}'),
        ("Unknown type", '{"type": "unknown_type", "message": "test"}'),
        ("Missing message", '{"type": "chat"}'),
    ]
    
    for test_name, message_data in test_cases:
        print(f"\n🧪 Testing: {test_name}")
        try:
            await consumer.receive(message_data)
            print("✅ Error handled gracefully")
        except Exception as e:
            print(f"💥 Unhandled error: {e}")
    
    print(f"\n📊 Total errors caught: {len([m for m in error_messages if m.get('type') == 'error'])}")


async def main():
    """Main test function."""
    print("🚀 WebSocket Consumer & Chat Test Suite")
    print("=" * 80)
    
    try:
        # Run all tests
        await test_consumer_lifecycle()
        await test_message_processing()
        await test_agent_integration()
        await simulate_real_chat()
        await test_error_handling()
        
        print("\n🎉 All tests completed!")
        
    except Exception as e:
        print(f"💥 Test suite failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
