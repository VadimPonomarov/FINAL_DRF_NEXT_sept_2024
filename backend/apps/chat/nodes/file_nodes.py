"""
File operation nodes for reading, writing, and analyzing files.
"""

import logging
import os
import json
import base64
import csv
from typing import Dict, Any, Optional, List
from pathlib import Path
from apps.chat.types.types import AgentState
import mimetypes

logger = logging.getLogger(__name__)

# Supported file types
SUPPORTED_TEXT_EXTENSIONS = {'.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml', '.csv', '.log'}
SUPPORTED_BINARY_EXTENSIONS = {'.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg', '.gif'}


class FileService:
    """Service for file operations."""
    
    def __init__(self, base_path: str = "/app/temp"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)
    
    def is_safe_path(self, file_path: str) -> bool:
        """Check if file path is safe (within allowed directory)."""
        try:
            full_path = (self.base_path / file_path).resolve()
            return str(full_path).startswith(str(self.base_path.resolve()))
        except Exception:
            return False
    
    def read_text_file(self, file_path: str, encoding: str = 'utf-8') -> str:
        """Read text file content."""
        if not self.is_safe_path(file_path):
            raise ValueError(f"Unsafe file path: {file_path}")
        
        full_path = self.base_path / file_path
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(full_path, 'r', encoding=encoding) as f:
            return f.read()
    
    def write_text_file(self, file_path: str, content: str, encoding: str = 'utf-8') -> bool:
        """Write content to text file."""
        if not self.is_safe_path(file_path):
            raise ValueError(f"Unsafe file path: {file_path}")
        
        full_path = self.base_path / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, 'w', encoding=encoding) as f:
            f.write(content)
        
        return True
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get file information."""
        if not self.is_safe_path(file_path):
            raise ValueError(f"Unsafe file path: {file_path}")
        
        full_path = self.base_path / file_path
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        stat = full_path.stat()
        mime_type, _ = mimetypes.guess_type(str(full_path))
        
        return {
            "name": full_path.name,
            "path": file_path,
            "size": stat.st_size,
            "modified": stat.st_mtime,
            "mime_type": mime_type,
            "extension": full_path.suffix.lower(),
            "is_text": full_path.suffix.lower() in SUPPORTED_TEXT_EXTENSIONS,
            "is_binary": full_path.suffix.lower() in SUPPORTED_BINARY_EXTENSIONS
        }
    
    def list_files(self, directory: str = "") -> List[Dict[str, Any]]:
        """List files in directory."""
        if not self.is_safe_path(directory):
            raise ValueError(f"Unsafe directory path: {directory}")
        
        full_path = self.base_path / directory
        if not full_path.exists():
            return []
        
        files = []
        for item in full_path.iterdir():
            if item.is_file():
                try:
                    rel_path = item.relative_to(self.base_path)
                    files.append(self.get_file_info(str(rel_path)))
                except Exception as e:
                    logger.warning(f"Error getting info for {item}: {e}")
        
        return files


# Global service instance
file_service = FileService()


def file_read_node(state: AgentState) -> AgentState:
    """
    Read file content.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with file content
    """
    try:
        # Extract file path from query or context
        file_path = state.context.get("file_path")
        if not file_path:
            # Try to extract from query
            import re
            path_match = re.search(r'файл[:\s]+([^\s]+)|file[:\s]+([^\s]+)', state.query, re.IGNORECASE)
            if path_match:
                file_path = path_match.group(1) or path_match.group(2)
        
        if not file_path:
            return state.model_copy(update={
                "error": "No file path specified. Please provide a file path to read."
            })
        
        # Get file info
        file_info = file_service.get_file_info(file_path)
        
        # Read file content
        if file_info["is_text"]:
            content = file_service.read_text_file(file_path)
            
            # Truncate if too long
            max_length = state.context.get("max_file_length", 5000)
            if len(content) > max_length:
                content = content[:max_length] + f"\n\n[Content truncated - showing first {max_length} characters]"
            
            result = f"**File:** {file_info['name']}\n"
            result += f"**Path:** {file_path}\n"
            result += f"**Size:** {file_info['size']} bytes\n"
            result += f"**Type:** {file_info['mime_type']}\n\n"
            result += f"**Content:**\n```\n{content}\n```"
            
        else:
            result = f"**File:** {file_info['name']}\n"
            result += f"**Path:** {file_path}\n"
            result += f"**Size:** {file_info['size']} bytes\n"
            result += f"**Type:** {file_info['mime_type']}\n\n"
            result += "This is a binary file. Content cannot be displayed as text."
        
        # Store file info in state
        state.add_intermediate_result("file_info", file_info)
        state.add_intermediate_result("file_content", content if file_info["is_text"] else None)
        
        return state.model_copy(update={
            "result": result,
            "files": {
                **state.files,
                file_path: file_info
            },
            "metadata": {
                **state.metadata,
                "file_read": file_path,
                "file_size": file_info["size"],
                "file_type": file_info["mime_type"]
            }
        })
        
    except FileNotFoundError as e:
        return state.model_copy(update={"error": f"File not found: {str(e)}"})
    except ValueError as e:
        return state.model_copy(update={"error": f"Invalid file path: {str(e)}"})
    except Exception as e:
        error_msg = f"File read error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def file_write_node(state: AgentState) -> AgentState:
    """
    Write content to file.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with write result
    """
    try:
        # Extract file path and content from context
        file_path = state.context.get("file_path")
        content = state.context.get("file_content")
        
        if not file_path:
            return state.model_copy(update={
                "error": "No file path specified for writing."
            })
        
        if content is None:
            return state.model_copy(update={
                "error": "No content specified for writing."
            })
        
        # Write file
        success = file_service.write_text_file(file_path, content)
        
        if success:
            # Get file info
            file_info = file_service.get_file_info(file_path)
            
            result = f"**File written successfully:**\n"
            result += f"**Path:** {file_path}\n"
            result += f"**Size:** {file_info['size']} bytes\n"
            result += f"**Content length:** {len(content)} characters"
            
            # Store file info in state
            state.add_intermediate_result("file_written", file_info)
            
            return state.model_copy(update={
                "result": result,
                "files": {
                    **state.files,
                    file_path: file_info
                },
                "metadata": {
                    **state.metadata,
                    "file_written": file_path,
                    "content_length": len(content)
                }
            })
        else:
            return state.model_copy(update={
                "error": "Failed to write file."
            })
        
    except ValueError as e:
        return state.model_copy(update={"error": f"Invalid file path: {str(e)}"})
    except Exception as e:
        error_msg = f"File write error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def file_list_node(state: AgentState) -> AgentState:
    """
    List files in directory.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with file list
    """
    try:
        # Extract directory from context or use root
        directory = state.context.get("directory", "")
        
        # List files
        files = file_service.list_files(directory)
        
        if not files:
            result = f"No files found in directory: {directory or 'root'}"
        else:
            result = f"**Files in {directory or 'root'}:**\n\n"
            for file_info in files:
                result += f"- **{file_info['name']}** ({file_info['size']} bytes, {file_info['mime_type']})\n"
        
        # Store file list in state
        state.add_intermediate_result("file_list", files)
        
        return state.model_copy(update={
            "result": result,
            "metadata": {
                **state.metadata,
                "files_listed": len(files),
                "directory": directory
            }
        })
        
    except ValueError as e:
        return state.model_copy(update={"error": f"Invalid directory path: {str(e)}"})
    except Exception as e:
        error_msg = f"File list error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def file_analysis_node(state: AgentState) -> AgentState:
    """
    Analyze file content using ChatAI.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with file analysis
    """
    try:
        # First read the file
        read_state = file_read_node(state)
        if read_state.has_error():
            return read_state
        
        # Get file content
        file_content = read_state.get_intermediate_result("file_content")
        file_info = read_state.get_intermediate_result("file_info")
        
        if not file_content:
            return state.model_copy(update={
                "error": "Cannot analyze binary files or empty files."
            })
        
        # Prepare analysis prompt
        analysis_prompt = f"""
Please analyze the following file:

**File Name:** {file_info['name']}
**File Type:** {file_info['mime_type']}
**File Size:** {file_info['size']} bytes

**Content:**
```
{file_content}
```

Please provide:
1. A summary of what this file contains
2. The file's purpose and structure
3. Any notable patterns, issues, or insights
4. Suggestions for improvement (if applicable)
"""
        
        # Update state with analysis prompt
        analysis_state = read_state.model_copy(update={
            "query": analysis_prompt,
            "context": {
                **read_state.context,
                "file_analysis": True,
                "original_query": state.query
            }
        })
        
        # Use ChatAI for analysis
        from .chatai_nodes import chatai_enhanced_text_node
        result_state = chatai_enhanced_text_node(analysis_state)
        
        # Restore original query but keep analysis result
        return result_state.model_copy(update={
            "query": state.query,
            "metadata": {
                **result_state.metadata,
                "file_analyzed": file_info["path"],
                "analysis_performed": True
            }
        })
        
    except Exception as e:
        error_msg = f"File analysis error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def attached_file_analysis_node(state: AgentState) -> AgentState:
    """
    Analyze attached files from frontend (base64 encoded).

    Args:
        state: Current agent state with files in context

    Returns:
        Updated state with file analysis
    """
    try:
        # Get attached files from context
        files = state.context.get("files", [])

        if not files:
            return state.model_copy(update={
                "error": "No attached files found in context"
            })

        results = []

        for file_data in files:
            try:
                # Extract file information
                file_name = file_data.get("name", "unknown_file")
                file_type = file_data.get("type", "application/octet-stream")
                file_size = file_data.get("size", 0)
                file_content_b64 = file_data.get("content", "")

                logger.info(f"Processing attached file: {file_name} ({file_type}, {file_size} bytes)")

                # Decode base64 content
                try:
                    file_content_bytes = base64.b64decode(file_content_b64)
                except Exception as decode_error:
                    logger.error(f"Failed to decode base64 content for {file_name}: {decode_error}")
                    results.append(f"**Error processing {file_name}:** Invalid file encoding")
                    continue

                # Try to decode as text if it's a text file
                file_content_text = None
                is_text_file = file_type.startswith('text/') or file_name.endswith(('.txt', '.py', '.js', '.json', '.csv', '.md', '.html', '.xml'))

                if is_text_file:
                    try:
                        file_content_text = file_content_bytes.decode('utf-8')
                    except UnicodeDecodeError:
                        try:
                            file_content_text = file_content_bytes.decode('latin-1')
                        except UnicodeDecodeError:
                            is_text_file = False

                # Create file analysis
                file_result = f"**File:** {file_name}\n"
                file_result += f"**Type:** {file_type}\n"
                file_result += f"**Size:** {file_size} bytes\n\n"

                if is_text_file and file_content_text:
                    # Analyze text content
                    lines = file_content_text.split('\n')
                    file_result += f"**Content Preview:**\n"
                    file_result += f"- Lines: {len(lines)}\n"
                    file_result += f"- Characters: {len(file_content_text)}\n\n"

                    # Show first few lines
                    preview_lines = lines[:10]
                    file_result += "**First 10 lines:**\n```\n"
                    file_result += '\n'.join(preview_lines)
                    if len(lines) > 10:
                        file_result += f"\n... ({len(lines) - 10} more lines)"
                    file_result += "\n```\n\n"

                    # Use ChatAI for detailed analysis
                    analysis_prompt = f"""
Please analyze this file and answer the user's question.

User question: {state.query}

File: {file_name}
Type: {file_type}
Content:
{file_content_text[:2000]}{'...' if len(file_content_text) > 2000 else ''}

Please provide a comprehensive answer to the user's question about this file.
"""

                    analysis_state = state.model_copy(update={
                        "query": analysis_prompt,
                        "context": {
                            **state.context,
                            "file_analysis": True,
                            "original_query": state.query,
                            "file_name": file_name,
                            "file_content": file_content_text
                        }
                    })

                    from .chatai_nodes import chatai_enhanced_text_node
                    analyzed_state = chatai_enhanced_text_node(analysis_state)

                    if not analyzed_state.has_error():
                        file_result += f"**Analysis:**\n{analyzed_state.result}\n\n"
                    else:
                        file_result += f"**Analysis Error:** {analyzed_state.error}\n\n"

                else:
                    file_result += "This is a binary file. Content cannot be displayed as text.\n\n"

                results.append(file_result)

            except Exception as file_error:
                logger.error(f"Error processing file {file_data.get('name', 'unknown')}: {file_error}")
                results.append(f"**Error processing file:** {str(file_error)}\n\n")

        # Combine all results
        final_result = f"**Analyzed {len(files)} attached file(s):**\n\n"
        final_result += "\n---\n\n".join(results)

        return state.model_copy(update={
            "result": final_result,
            "metadata": {
                **state.metadata,
                "attached_files_processed": len(files),
                "files_analyzed": [f.get("name", "unknown") for f in files]
            }
        })

    except Exception as e:
        logger.error(f"Attached file analysis error: {e}")
        return state.model_copy(update={
            "error": f"Attached file analysis failed: {str(e)}"
        })
