# Enhanced Chat Agent Architecture

## Overview

This is a complete rewrite of the chat system using **LangGraph + LangChain** for intelligent conversation processing. The new architecture provides:

- **Multi-modal AI capabilities** with ChatAI for text and image generation
- **Real-time information retrieval** with Tavily Search
- **Web scraping and analysis** with Crawl4AI
- **Code execution** in safe environments
- **File operations** for reading, writing, and analyzing files
- **Intelligent intent classification** for routing requests
- **Clean separation of concerns** between orchestration and AI processing

## Architecture Components

### 🧠 Core Components

#### 1. **EnhancedChatAgent** (`agent.py`)
- Main interface between WebSocket consumer and LangGraph pipeline
- Handles message preprocessing, state management, and response formatting
- Delegates all AI processing to the graph

#### 2. **EnhancedChatConsumer** (`consumer.py`)
- Pure orchestrator for WebSocket connections
- Handles authentication, connection lifecycle, and message routing
- Formats responses for frontend consumption
- No AI logic - purely infrastructure

#### 3. **LangGraph Pipeline** (`graph.py`)
- Intelligent routing based on intent classification
- Modular node-based processing
- Support for complex multi-step workflows

### 🎯 Intent Classification (`classifiers/`)

The system automatically classifies user intents:

- **GENERAL_CHAT**: Regular conversation
- **IMAGE_GENERATION**: Create images with ChatAI flux-schnell
- **FACTUAL_SEARCH**: Search current information with Tavily
- **WEB_CRAWLING**: Scrape and analyze web content with Crawl4AI
- **CODE_EXECUTION**: Execute Python code safely
- **FILE_READ/WRITE/ANALYSIS**: File operations
- **DATETIME**: Date and time queries

### 🔧 Processing Nodes (`nodes/`)

#### ChatAI Nodes (`chatai_nodes.py`)
- `chatai_text_node`: Text generation with ChatAI
- `chatai_image_node`: Image generation with flux-schnell
- `chatai_enhanced_text_node`: Context-aware text generation

#### Search Nodes (`tavily_nodes.py`)
- `tavily_search_node`: Basic web search
- `tavily_enhanced_search_node`: Search + AI synthesis
- `tavily_context_node`: Context extraction for other nodes

#### Web Scraping Nodes (`crawl4ai_nodes.py`)
- `crawl4ai_extract_node`: Extract content from URLs
- `crawl4ai_ask_node`: AI-powered content analysis
- `crawl4ai_multi_url_node`: Process multiple URLs

#### File Operation Nodes (`file_nodes.py`)
- `file_read_node`: Read file contents
- `file_write_node`: Write to files
- `file_analysis_node`: AI-powered file analysis

#### Utility Nodes (`utility_nodes.py`)
- `datetime_node`: Timestamp management
- `codegen_node`: Python code generation
- `riza_exec_node`: Safe code execution
- `final_output_node`: Response formatting

## Data Flow

```
User Message → WebSocket Consumer → ChatAgent → LangGraph Pipeline
                     ↓
Frontend ← Response Formatting ← Agent Processing ← Node Execution
```

### Detailed Flow:

1. **WebSocket Consumer** receives message
2. **Authentication & Validation** 
3. **ChatAgent** creates initial state
4. **Intent Classifier** determines request type
5. **Graph Router** selects appropriate node
6. **Node Execution** processes request
7. **Response Formatting** for frontend
8. **WebSocket Consumer** sends response

## Configuration

### Environment Variables

```bash
# Tavily Search (optional)
TAVILY_API_KEY=your_tavily_api_key

# File operations directory
CHAT_FILES_DIR=/app/temp

# Debug mode
CHAT_DEBUG_MODE=true
```

### Dependencies

Key packages required:
- `langgraph` - Graph-based workflow orchestration
- `langchain` - LLM framework
- `g4f` - ChatAI integration
- `tavily-python` - Web search (optional)
- `crawl4ai` - Web scraping (optional)

## Usage Examples

### Basic Chat
```python
agent = EnhancedChatAgent(user_id="user123")
response = await agent.process_message("Hello, how are you?")
```

### Image Generation
```python
response = await agent.process_message("Create an image of a sunset over mountains")
# Returns image URL from ChatAI flux-schnell
```

### Web Search
```python
response = await agent.process_message("What are the latest AI developments?")
# Uses Tavily to search and synthesize current information
```

### Code Execution
```python
response = await agent.process_message("Execute: print('Hello World')")
# Safely executes Python code and returns output
```

### File Operations
```python
response = await agent.process_message("Read file data.txt")
# Reads and displays file contents
```

## Testing

Run the test suite:

```bash
cd backend/apps/chat
python test_enhanced_agent.py
```

The test script includes:
- Graph structure validation
- Intent classification testing
- Basic functionality tests
- Interactive testing mode

## WebSocket API

### Message Format

#### Incoming Messages
```json
{
  "type": "chat",
  "message": "Your message here",
  "context": {
    "debug_mode": false
  }
}
```

#### Response Format
```json
{
  "type": "message",
  "message": "AI response",
  "role": "assistant",
  "timestamp": "2024-01-01T12:00:00Z",
  "metadata": {
    "intent": "general_chat",
    "processing_time": 1500,
    "session_id": "session_123"
  }
}
```

### Message Types

- `chat` - Regular chat message
- `ping` - Connection keepalive
- `chat_history` - Request chat history
- `clear_history` - Clear chat history

## Error Handling

The system provides comprehensive error handling:

- **Connection errors** - Authentication, network issues
- **Processing errors** - AI model failures, timeouts
- **Validation errors** - Invalid input, missing parameters
- **Node errors** - Individual node failures with fallbacks

All errors are logged and returned in structured format to the frontend.

## Performance Considerations

- **Graph Caching**: Global graph instance for reuse
- **Async Processing**: Non-blocking AI operations
- **Connection Pooling**: Efficient WebSocket management
- **Error Recovery**: Graceful degradation on failures

## Security

- **Input Validation**: All user inputs are validated
- **Code Execution**: Sandboxed Python execution
- **File Access**: Restricted to safe directories
- **Authentication**: JWT-based user validation

## Future Enhancements

- [ ] Multi-language support
- [ ] Voice message processing
- [ ] Document upload and analysis
- [ ] Integration with external APIs
- [ ] Advanced conversation memory
- [ ] Custom tool creation interface
