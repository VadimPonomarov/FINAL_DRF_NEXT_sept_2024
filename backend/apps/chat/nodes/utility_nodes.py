"""
Utility nodes for basic operations like datetime, code generation, and output formatting.
"""

import logging
from datetime import datetime
from typing import Dict, Any
from apps.chat.types.types import AgentState
import subprocess
import tempfile
import os
import re

logger = logging.getLogger(__name__)


def datetime_node(state: AgentState) -> AgentState:
    """
    Set current timestamp in agent state and handle datetime queries.

    Args:
        state: Current agent state

    Returns:
        Updated state with current timestamp and datetime response if needed
    """
    current_time = datetime.now()

    # Check if this is a datetime query that needs a direct response
    query_lower = state.query.lower()
    datetime_keywords = [
        "который час", "сколько время", "какое время", "what time",
        "какое сегодня число", "какая дата", "what date", "today",
        "по киевскому времени", "kiev time", "kyiv time"
    ]

    if any(keyword in query_lower for keyword in datetime_keywords):
        # This is a datetime query, provide direct response
        if any(word in query_lower for word in ["час", "время", "time"]):
            # Time query
            if "киев" in query_lower or "kiev" in query_lower or "kyiv" in query_lower:
                # Kiev time (UTC+2 in winter, UTC+3 in summer)
                import pytz
                kiev_tz = pytz.timezone('Europe/Kiev')
                kiev_time = current_time.astimezone(kiev_tz)
                response = f"По киевскому времени сейчас {kiev_time.strftime('%H:%M')}, {kiev_time.strftime('%d %B %Y года')}."
            else:
                response = f"Сейчас {current_time.strftime('%H:%M')}, {current_time.strftime('%d %B %Y года')}."
        else:
            # Date query
            response = f"Сегодня {current_time.strftime('%d %B %Y года')} ({current_time.strftime('%A')})."

        return state.model_copy(update={
            "now": current_time,
            "result": response,
            "metadata": {
                **state.metadata,
                "datetime_response": True,
                "response_type": "direct_datetime"
            }
        })

    # Not a datetime query, just set timestamp
    return state.model_copy(update={"now": current_time})


def codegen_node(state: AgentState) -> AgentState:
    """
    Generate Python code for execution based on query.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with generated code
    """
    try:
        query_lower = state.query.lower()
        
        # Check if code is already provided
        if "```python" in state.query or "def " in state.query or "import " in state.query:
            # Extract code from markdown blocks if present
            code_match = re.search(r'```python\n(.*?)\n```', state.query, re.DOTALL)
            if code_match:
                code = code_match.group(1)
            else:
                code = state.query
        else:
            # Generate code based on common patterns
            if "какое сегодня число" in query_lower or "what date" in query_lower:
                code = (
                    "import datetime\n"
                    "result = datetime.date.today().strftime('%d.%m.%Y')\n"
                    "print(f'Сегодня: {result}')"
                )
            elif any(keyword in query_lower for keyword in ["который час", "сколько время", "what time"]):
                code = (
                    "import datetime\n"
                    "result = datetime.datetime.now().strftime('%H:%M:%S')\n"
                    "print(f'Текущее время: {result}')"
                )
            elif "calculate" in query_lower or "вычисли" in query_lower:
                # Extract mathematical expression
                math_match = re.search(r'(\d+[\+\-\*/\d\s\(\)\.]+\d+)', state.query)
                if math_match:
                    expression = math_match.group(1)
                    code = f"result = {expression}\nprint(f'Результат: {{result}}')"
                else:
                    code = "print('Не удалось найти математическое выражение')"
            else:
                # Default: treat query as code
                code = state.query
        
        # Store generated code
        state.add_intermediate_result("generated_code", code)
        
        return state.model_copy(update={
            "query": code,  # Replace query with generated code for execution
            "metadata": {
                **state.metadata,
                "code_generated": True,
                "original_query": state.query
            }
        })
        
    except Exception as e:
        error_msg = f"Code generation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def riza_exec_node(state: AgentState) -> AgentState:
    """
    Execute Python code safely.
    
    Args:
        state: Current agent state with code in query
        
    Returns:
        Updated state with execution result
    """
    try:
        code = state.query
        
        # Basic safety checks
        dangerous_patterns = [
            r'import\s+os', r'import\s+subprocess', r'import\s+sys',
            r'__import__', r'eval\s*\(', r'exec\s*\(',
            r'open\s*\(', r'file\s*\(', r'input\s*\(',
            r'raw_input\s*\(', r'compile\s*\('
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                return state.model_copy(update={
                    "error": f"Code contains potentially dangerous operations: {pattern}"
                })
        
        # Execute code in temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_path = f.name
        
        try:
            # Execute with timeout
            result = subprocess.run(
                ['python', temp_path],
                capture_output=True,
                text=True,
                timeout=10,  # 10 second timeout
                cwd=tempfile.gettempdir()
            )
            
            if result.returncode == 0:
                output = result.stdout.strip()
                if not output:
                    output = "Code executed successfully (no output)"
            else:
                output = f"Error: {result.stderr.strip()}"
                
        except subprocess.TimeoutExpired:
            output = "Error: Code execution timed out (10 seconds limit)"
        except Exception as e:
            output = f"Execution error: {str(e)}"
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except Exception:
                pass
        
        return state.model_copy(update={
            "result": output,
            "metadata": {
                **state.metadata,
                "code_executed": True,
                "execution_successful": not output.startswith("Error:")
            }
        })
        
    except Exception as e:
        error_msg = f"Code execution error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def final_output_node(state: AgentState) -> AgentState:
    """
    Format final output for the user.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with formatted final result
    """
    try:
        # If there's an error, return it
        if state.has_error():
            return state.model_copy(update={
                "result": f"❌ {state.error}",
                "metadata": {
                    **state.metadata,
                    "final_output_formatted": True,
                    "output_type": "error"
                }
            })
        
        # If there's already a result, format it nicely
        if state.result:
            formatted_result = state.result
            
            # Add metadata information if in debug mode
            if state.context.get("debug_mode"):
                debug_info = []
                if state.intent:
                    debug_info.append(f"Intent: {state.intent.value}")
                if state.data_mode:
                    debug_info.append(f"Data Mode: {state.data_mode.value}")
                if state.metadata.get("processing_time"):
                    debug_info.append(f"Processing Time: {state.metadata['processing_time']}ms")
                
                if debug_info:
                    formatted_result += f"\n\n*Debug Info: {', '.join(debug_info)}*"
            
            return state.model_copy(update={
                "result": formatted_result,
                "metadata": {
                    **state.metadata,
                    "final_output_formatted": True,
                    "output_type": "success"
                }
            })
        
        # Fallback if no result
        return state.model_copy(update={
            "result": "I processed your request, but didn't generate a specific response.",
            "metadata": {
                **state.metadata,
                "final_output_formatted": True,
                "output_type": "fallback"
            }
        })
        
    except Exception as e:
        error_msg = f"Output formatting error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={
            "result": f"❌ {error_msg}",
            "metadata": {
                **state.metadata,
                "final_output_formatted": True,
                "output_type": "error"
            }
        })


def debug_node(state: AgentState) -> AgentState:
    """
    Debug node for development and troubleshooting.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with debug information
    """
    debug_info = {
        "query": state.query,
        "intent": state.intent.value if state.intent else None,
        "data_mode": state.data_mode.value if state.data_mode else None,
        "has_result": bool(state.result),
        "has_error": state.has_error(),
        "intermediate_results_count": len(state.intermediate_results),
        "chat_history_length": len(state.chat_history),
        "metadata_keys": list(state.metadata.keys())
    }
    
    debug_output = "**Debug Information:**\n"
    for key, value in debug_info.items():
        debug_output += f"- {key}: {value}\n"
    
    return state.model_copy(update={
        "result": debug_output,
        "metadata": {
            **state.metadata,
            "debug_node_executed": True
        }
    })
