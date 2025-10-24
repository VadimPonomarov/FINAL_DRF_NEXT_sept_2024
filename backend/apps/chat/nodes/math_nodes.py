"""
Mathematical nodes for handling calculations, equations, and mathematical operations.
"""

import logging
import re
import math
from typing import Dict, Any, Union
from apps.chat.types.types import AgentState

logger = logging.getLogger(__name__)


def math_node(state: AgentState) -> AgentState:
    """
    Handle mathematical calculations and expressions.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with mathematical result
    """
    try:
        query = state.query.strip()
        query_lower = query.lower()
        
        # Mathematical keywords in multiple languages
        math_keywords = [
            # English
            'calculate', 'compute', 'solve', 'equation', 'formula', 'math', 'mathematics',
            'plus', 'minus', 'times', 'divided', 'multiply', 'add', 'subtract',
            'square', 'root', 'power', 'exponent', 'logarithm', 'sin', 'cos', 'tan',
            # Russian/Ukrainian
            'вычисли', 'посчитай', 'реши', 'уравнение', 'формула', 'математика',
            'плюс', 'минус', 'умножить', 'разделить', 'сложить', 'вычесть',
            'квадрат', 'корень', 'степень', 'логарифм', 'синус', 'косинус', 'тангенс'
        ]
        
        # Check if this is a mathematical query
        is_math_query = any(keyword in query_lower for keyword in math_keywords)
        
        # Also check for mathematical expressions
        has_math_expression = bool(re.search(r'[\d\+\-\*/\^\(\)\s]+[=<>]+[\d\+\-\*/\^\(\)\s]+', query))
        has_operators = bool(re.search(r'[\+\-\*/=<>]', query))
        has_numbers = bool(re.search(r'\d+', query))
        
        if not (is_math_query or has_math_expression or (has_operators and has_numbers)):
            return state.model_copy(update={
                "error": "No mathematical expression found in query"
            })
        
        # Extract mathematical expression
        expression = extract_math_expression(query)
        if not expression:
            return state.model_copy(update={
                "error": "Could not extract mathematical expression"
            })
        
        # Calculate result
        result = calculate_expression(expression)
        
        if result is None:
            return state.model_copy(update={
                "error": f"Could not calculate expression: {expression}"
            })
        
        # Format result
        if isinstance(result, float):
            if result.is_integer():
                result = int(result)
            else:
                result = round(result, 6)
        
        response = f"**Результат:** {expression} = {result}"
        
        # Add explanation if it's an equation
        if '=' in expression and not expression.endswith('='):
            response += f"\n\n**Объяснение:** Вычислено выражение {expression}"
        
        return state.model_copy(update={
            "result": response,
            "metadata": {
                **state.metadata,
                "math_calculation": True,
                "expression": expression,
                "calculated_result": result
            }
        })
        
    except Exception as e:
        error_msg = f"Mathematical calculation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def extract_math_expression(query: str) -> str:
    """
    Extract mathematical expression from query.
    
    Args:
        query: User query
        
    Returns:
        Extracted mathematical expression
    """
    # Remove common words and keep mathematical content
    query_lower = query.lower()
    
    # Replace common words with operators
    replacements = {
        'плюс': '+', 'plus': '+', 'сложить': '+', 'add': '+',
        'минус': '-', 'minus': '-', 'вычесть': '-', 'subtract': '-',
        'умножить': '*', 'times': '*', 'multiply': '*',
        'разделить': '/', 'divided by': '/', 'divide': '/',
        'равно': '=', 'equals': '=', '=': '=',
        'квадрат': '^2', 'square': '^2',
        'корень': 'sqrt', 'root': 'sqrt',
        'степень': '^', 'power': '^', 'в степени': '^',
        'икс': 'x', 'игрек': 'y', 'зет': 'z'
    }
    
    # Apply replacements
    for word, symbol in replacements.items():
        query_lower = re.sub(r'\b' + word + r'\b', symbol, query_lower)
    
    # Extract mathematical expression using regex
    # Look for patterns like: number operator number, equations, etc.
    
    # First priority: Function calls with parentheses
    function_pattern = r'(sin|cos|tan|sqrt|log|ln)\s*\([^)]+\)'
    function_matches = re.findall(function_pattern, query_lower)
    if function_matches:
        # Find the full match, not just the group
        full_match = re.search(function_pattern, query_lower)
        if full_match:
            return full_match.group(0).strip()
    
    # Also try to find function calls in the original query (case insensitive)
    original_function_pattern = r'(sin|cos|tan|sqrt|log|ln)\s*\([^)]+\)'
    original_match = re.search(original_function_pattern, query, re.IGNORECASE)
    if original_match:
        return original_match.group(0).strip()
    
    # Second priority: Equations with equals sign
    equation_pattern = r'[\d\.\+\-\*/\(\)\^x\s]*[=<>][\d\.\+\-\*/\(\)\^x\s]*'
    equation_matches = re.findall(equation_pattern, query_lower)
    if equation_matches:
        # Return the longest equation match
        equation = max(equation_matches, key=len).strip()
        if len(equation) > 3:  # At least 4 characters for a meaningful equation
            return equation
    
    # Third priority: Simple arithmetic expressions
    arithmetic_pattern = r'[\d\.\+\-\*/\(\)\^x\s]+'
    arithmetic_matches = re.findall(arithmetic_pattern, query_lower)
    if arithmetic_matches:
        # Return the longest match
        expression = max(arithmetic_matches, key=len).strip()
        if len(expression) > 2:  # At least 3 characters
            return expression
    
    # If no pattern matches, try to extract numbers and operators
    math_chars = re.findall(r'[\d\.\+\-\*/\(\)\^x=<>]', query_lower)
    if len(math_chars) >= 3:
        return ''.join(math_chars)
    
    return ""


def calculate_expression(expression: str) -> Union[int, float, None]:
    """
    Safely calculate mathematical expression.
    
    Args:
        expression: Mathematical expression to calculate
        
    Returns:
        Calculated result or None if error
    """
    try:
        # Clean expression
        expression = expression.strip()
        
        # Replace ^ with ** for Python exponentiation
        expression = expression.replace('^', '**')
        
        # Handle square root
        expression = re.sub(r'sqrt\s*\(([^)]+)\)', r'math.sqrt(\1)', expression)
        
        # Handle trigonometric functions
        expression = re.sub(r'sin\s*\(([^)]+)\)', r'math.sin(math.radians(\1))', expression)
        expression = re.sub(r'cos\s*\(([^)]+)\)', r'math.cos(math.radians(\1))', expression)
        expression = re.sub(r'tan\s*\(([^)]+)\)', r'math.tan(math.radians(\1))', expression)
        
        # Handle logarithms
        expression = re.sub(r'log\s*\(([^)]+)\)', r'math.log10(\1)', expression)
        expression = re.sub(r'ln\s*\(([^)]+)\)', r'math.log(\1)', expression)
        
        # Handle constants
        expression = expression.replace('pi', str(math.pi))
        expression = expression.replace('e', str(math.e))
        
        # Security check - only allow safe characters
        safe_chars = set('0123456789+-*/.()x^=<> ')
        if not all(c in safe_chars or c.isalpha() for c in expression):
            return None
        
        # For equations, solve for x if possible
        if '=' in expression and 'x' in expression:
            return solve_simple_equation(expression)
        
        # Handle equations without '=' but with 'x' - add '=' if needed
        if 'x' in expression and '=' not in expression:
            # Try to solve simple equations like "2x + 5" by setting equal to 0
            # This is a fallback for incomplete equations
            return None  # Can't solve without knowing what it equals
        
        # Regular calculation
        # Replace x with a temporary value for evaluation
        if 'x' in expression and '=' not in expression:
            return None  # Can't evaluate with undefined x
        
        # Evaluate the expression
        result = eval(expression, {"__builtins__": {}, "math": math})
        return result
        
    except Exception as e:
        logger.error(f"Error calculating expression '{expression}': {str(e)}")
        return None


def solve_simple_equation(equation: str) -> Union[int, float, None]:
    """
    Solve simple linear equations.
    
    Args:
        equation: Equation to solve (e.g., "2x + 5 = 17")
        
    Returns:
        Solution for x or None if can't solve
    """
    try:
        # Split equation into left and right parts
        if '=' not in equation:
            return None
        
        left, right = equation.split('=', 1)
        left = left.strip()
        right = right.strip()
        
        # Simple cases
        # 2x + 5 = 17 -> 2x = 17 - 5 -> x = 12/2
        # 2x = 10 -> x = 10/2
        
        # Extract coefficient and constant from left side
        left_coeff = 1
        left_const = 0
        
        # Handle cases like "2x + 5", "2x - 5", "5 + 2x", etc.
        if 'x' in left:
            # Find coefficient of x
            x_match = re.search(r'(\d*)\s*x', left)
            if x_match:
                coeff_str = x_match.group(1)
                left_coeff = int(coeff_str) if coeff_str else 1
            
            # Find constant term
            const_match = re.search(r'([+-]?\d+)(?![^+-]*x)', left)
            if const_match:
                left_const = int(const_match.group(1))
        
        # Get right side value
        right_value = 0.0
        try:
            right_value = float(right)
        except ValueError:
            return None
        
        # Solve: left_coeff * x + left_const = right_value
        # x = (right_value - left_const) / left_coeff
        
        if left_coeff == 0:
            return None
        
        solution = (right_value - left_const) / left_coeff
        
        # Convert to int if it's a whole number
        if solution.is_integer():
            return int(solution)
        
        return round(solution, 6)
        
    except Exception as e:
        logger.error(f"Error solving equation '{equation}': {str(e)}")
        return None


def advanced_math_node(state: AgentState) -> AgentState:
    """
    Handle advanced mathematical operations like calculus, statistics, etc.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with advanced mathematical result
    """
    try:
        query = state.query.strip()
        query_lower = query.lower()
        
        # Advanced math keywords
        advanced_keywords = [
            'derivative', 'integral', 'limit', 'calculus',
            'statistics', 'mean', 'median', 'mode', 'standard deviation',
            'probability', 'permutation', 'combination',
            'производная', 'интеграл', 'предел', 'математический анализ',
            'статистика', 'среднее', 'медиана', 'мода', 'дисперсия',
            'вероятность', 'перестановка', 'сочетание'
        ]
        
        if not any(keyword in query_lower for keyword in advanced_keywords):
            return state.model_copy(update={
                "error": "Advanced mathematical operation not recognized"
            })
        
        # For now, return a helpful message
        response = """**Продвинутые математические операции**
        
Пока что я могу решать:
- Базовые арифметические операции (+, -, *, /, ^)
- Простые уравнения (2x + 5 = 17)
- Тригонометрические функции (sin, cos, tan)
- Логарифмы (log, ln)
- Квадратные корни (sqrt)
- Константы (pi, e)

Для более сложных операций (производные, интегралы, статистика) используйте специализированные математические программы."""
        
        return state.model_copy(update={
            "result": response,
            "metadata": {
                **state.metadata,
                "advanced_math_query": True
            }
        })
        
    except Exception as e:
        error_msg = f"Advanced mathematical operation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})
