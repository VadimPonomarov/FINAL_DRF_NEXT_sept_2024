"""
Data analysis nodes using pandas and seaborn.
Provides statistical processing, grouping, and visualization tools.
"""

import logging
import pandas as pd
import seaborn as sns
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import io
import base64
from typing import Dict, Any, List, Optional
from apps.chat.types.types import AgentState
from datetime import datetime

logger = logging.getLogger(__name__)


class DataAnalysisService:
    """
    Service for data analysis using pandas and seaborn.
    
    Capabilities:
    - Statistical analysis (mean, median, std, correlations)
    - Data grouping and aggregation
    - Data filtering and transformation
    - Visualization (charts, plots, heatmaps)
    """
    
    def __init__(self):
        # Set seaborn style
        sns.set_theme(style="whitegrid")
        sns.set_palette("husl")
    
    def analyze_data(self, data: List[Dict[str, Any]], query: str) -> Dict[str, Any]:
        """
        Analyze structured data based on user query.
        
        Args:
            data: List of dictionaries with data
            query: User's analysis request
            
        Returns:
            Dict with analysis results and visualizations
        """
        try:
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Detect analysis type from query
            query_lower = query.lower()
            
            results = {
                'dataframe_info': self._get_dataframe_info(df),
                'statistics': None,
                'grouped_data': None,
                'visualization': None,
                'summary_text': ""
            }
            
            # Statistical analysis
            if any(word in query_lower for word in ['статист', 'средн', 'mean', 'average', 'корреля', 'correlation']):
                results['statistics'] = self._statistical_analysis(df)
                results['summary_text'] += self._format_statistics(results['statistics'])
            
            # Grouping and aggregation
            if any(word in query_lower for word in ['групп', 'group', 'по', 'by', 'агрегац', 'aggregate']):
                results['grouped_data'] = self._group_data(df, query)
                results['summary_text'] += self._format_grouped(results['grouped_data'])
            
            # Visualization
            if any(word in query_lower for word in ['график', 'chart', 'plot', 'визуализ', 'visualize', 'покаж', 'show']):
                results['visualization'] = self._create_visualization(df, query)
            
            # If no specific analysis requested, provide overview
            if not results['statistics'] and not results['grouped_data']:
                results['statistics'] = self._statistical_analysis(df)
                results['summary_text'] = "📊 **Обзор данных:**\n\n" + self._format_statistics(results['statistics'])
            
            return results
            
        except Exception as e:
            logger.error(f"Data analysis error: {e}", exc_info=True)
            return {
                'error': str(e),
                'summary_text': f"❌ Ошибка анализа данных: {str(e)}"
            }
    
    def _get_dataframe_info(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get basic DataFrame information."""
        return {
            'rows': len(df),
            'columns': len(df.columns),
            'column_names': df.columns.tolist(),
            'column_types': df.dtypes.astype(str).to_dict(),
            'memory_usage': df.memory_usage(deep=True).sum(),
        }
    
    def _statistical_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Perform statistical analysis on numeric columns."""
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        
        if not numeric_cols:
            return {'message': 'No numeric columns for statistical analysis'}
        
        stats = {}
        for col in numeric_cols:
            stats[col] = {
                'count': int(df[col].count()),
                'mean': float(df[col].mean()) if not df[col].isna().all() else None,
                'median': float(df[col].median()) if not df[col].isna().all() else None,
                'std': float(df[col].std()) if not df[col].isna().all() else None,
                'min': float(df[col].min()) if not df[col].isna().all() else None,
                'max': float(df[col].max()) if not df[col].isna().all() else None,
                'q25': float(df[col].quantile(0.25)) if not df[col].isna().all() else None,
                'q75': float(df[col].quantile(0.75)) if not df[col].isna().all() else None,
            }
        
        # Correlation matrix
        if len(numeric_cols) > 1:
            stats['correlation_matrix'] = df[numeric_cols].corr().to_dict()
        
        return stats
    
    def _group_data(self, df: pd.DataFrame, query: str) -> Dict[str, Any]:
        """
        Group data based on query.
        
        Tries to intelligently determine grouping column from query.
        """
        # Try to find column name in query
        group_col = None
        for col in df.columns:
            if col.lower() in query.lower():
                group_col = col
                break
        
        if not group_col:
            # Use first non-numeric column as default
            non_numeric = df.select_dtypes(exclude=['number']).columns
            if len(non_numeric) > 0:
                group_col = non_numeric[0]
        
        if not group_col:
            return {'message': 'Could not determine grouping column'}
        
        # Find numeric columns for aggregation
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        
        if not numeric_cols:
            # Just count occurrences
            grouped = df[group_col].value_counts().to_dict()
            return {
                'grouped_by': group_col,
                'aggregation': 'count',
                'results': grouped
            }
        
        # Perform grouping with multiple aggregations
        agg_funcs = ['mean', 'sum', 'count', 'min', 'max']
        grouped = df.groupby(group_col)[numeric_cols].agg(agg_funcs)
        
        return {
            'grouped_by': group_col,
            'numeric_columns': numeric_cols,
            'aggregation': agg_funcs,
            'results': grouped.to_dict()
        }
    
    def _create_visualization(self, df: pd.DataFrame, query: str) -> Optional[str]:
        """
        Create visualization based on data and query.
        
        Returns base64-encoded image string.
        """
        try:
            fig, ax = plt.subplots(figsize=(10, 6))
            
            query_lower = query.lower()
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            
            # Determine chart type
            if 'гистограмм' in query_lower or 'histogram' in query_lower:
                if numeric_cols:
                    df[numeric_cols[0]].hist(ax=ax, bins=20, edgecolor='black')
                    ax.set_title(f'Histogram: {numeric_cols[0]}')
            
            elif 'тепловая' in query_lower or 'heatmap' in query_lower or 'корреля' in query_lower:
                if len(numeric_cols) > 1:
                    corr = df[numeric_cols].corr()
                    sns.heatmap(corr, annot=True, fmt='.2f', cmap='coolwarm', ax=ax)
                    ax.set_title('Correlation Heatmap')
            
            elif 'scatter' in query_lower or 'точечн' in query_lower:
                if len(numeric_cols) >= 2:
                    ax.scatter(df[numeric_cols[0]], df[numeric_cols[1]], alpha=0.6)
                    ax.set_xlabel(numeric_cols[0])
                    ax.set_ylabel(numeric_cols[1])
                    ax.set_title(f'{numeric_cols[0]} vs {numeric_cols[1]}')
            
            elif 'box' in query_lower or 'ящик' in query_lower:
                if numeric_cols:
                    df[numeric_cols].boxplot(ax=ax)
                    ax.set_title('Box Plot')
            
            else:
                # Default: bar chart of first numeric column
                if numeric_cols:
                    non_numeric = df.select_dtypes(exclude=['number']).columns
                    if len(non_numeric) > 0:
                        # Grouped bar chart
                        grouped = df.groupby(non_numeric[0])[numeric_cols[0]].mean()
                        grouped.plot(kind='bar', ax=ax)
                        ax.set_title(f'Average {numeric_cols[0]} by {non_numeric[0]}')
                        ax.set_xlabel(non_numeric[0])
                        ax.set_ylabel(numeric_cols[0])
                    else:
                        # Simple line plot
                        df[numeric_cols[0]].plot(ax=ax)
                        ax.set_title(f'{numeric_cols[0]} Trend')
            
            plt.tight_layout()
            
            # Convert to base64
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close(fig)
            
            return f"data:image/png;base64,{image_base64}"
            
        except Exception as e:
            logger.error(f"Visualization error: {e}", exc_info=True)
            return None
    
    def _format_statistics(self, stats: Dict[str, Any]) -> str:
        """Format statistics for text output."""
        if not stats or 'message' in stats:
            return stats.get('message', '')
        
        text = "**📈 Статистический анализ:**\n\n"
        
        for col, values in stats.items():
            if col == 'correlation_matrix':
                continue
            
            text += f"**{col}:**\n"
            if values.get('mean') is not None:
                text += f"  • Среднее: {values['mean']:.2f}\n"
                text += f"  • Медиана: {values['median']:.2f}\n"
                text += f"  • Std: {values['std']:.2f}\n"
                text += f"  • Min: {values['min']:.2f}, Max: {values['max']:.2f}\n"
                text += f"  • Q25: {values['q25']:.2f}, Q75: {values['q75']:.2f}\n"
            text += "\n"
        
        return text
    
    def _format_grouped(self, grouped: Dict[str, Any]) -> str:
        """Format grouped data for text output."""
        if not grouped or 'message' in grouped:
            return grouped.get('message', '')
        
        text = f"\n**🔢 Группировка по '{grouped['grouped_by']}':**\n\n"
        
        if grouped['aggregation'] == 'count':
            for key, value in grouped['results'].items():
                text += f"  • {key}: {value}\n"
        else:
            text += "_(См. детальную таблицу результатов)_\n"
        
        return text


# Global service instance
data_analysis_service = DataAnalysisService()


def pandas_analysis_node(state: AgentState) -> AgentState:
    """
    Analyze structured data using pandas and seaborn.
    
    Expects data in state.context['data_for_analysis'] or extracts from intermediate results.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with analysis results and visualizations
    """
    try:
        # Get data from context or intermediate results
        data = state.context.get('data_for_analysis')
        
        if not data:
            # Try to extract from table_data
            data = state.table_data
        
        if not data:
            return state.model_copy(update={
                "result": "❌ Нет данных для анализа. Предоставьте структурированные данные.",
                "metadata": {**state.metadata, "analysis_error": "no_data"}
            })
        
        # Perform analysis
        analysis_results = data_analysis_service.analyze_data(data, state.query)
        
        if 'error' in analysis_results:
            return state.model_copy(update={
                "result": analysis_results['summary_text'],
                "metadata": {**state.metadata, "analysis_error": analysis_results['error']}
            })
        
        # Build response
        response = analysis_results['summary_text']
        
        # Add chat message
        state.add_chat_message("assistant", response)
        
        # Prepare update dict
        update_dict = {
            "result": response,
            "metadata": {
                **state.metadata,
                "analysis_performed": True,
                "dataframe_info": analysis_results['dataframe_info'],
                "has_visualization": analysis_results['visualization'] is not None
            }
        }
        
        # Add visualization if available
        if analysis_results['visualization']:
            update_dict["image_url"] = analysis_results['visualization']
            update_dict["images"] = [*state.images, analysis_results['visualization']]
        
        return state.model_copy(update=update_dict)
        
    except Exception as e:
        error_msg = f"Pandas analysis error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return state.model_copy(update={"error": error_msg})

