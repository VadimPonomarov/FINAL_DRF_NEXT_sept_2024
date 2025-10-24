# 📊 Data Analysis Tools - Pandas & Seaborn Integration

## Overview

Новые инструменты для статистической обработки, группировки данных и графической интерпретации на основе **pandas** и **seaborn**.

---

## 🎯 Capabilities

### 1. **Statistical Analysis** (Статистический анализ)
- **Mean, Median, Std** (Среднее, Медиана, Стандартное отклонение)
- **Min/Max, Quantiles** (Минимум/Максимум, Квантили Q25/Q75)
- **Correlation Matrix** (Матрица корреляций для числовых столбцов)

### 2. **Data Grouping** (Группировка данных)
- **Group By** с автоматическим определением столбца для группировки
- **Aggregation Functions**: `mean`, `sum`, `count`, `min`, `max`
- **Value Counts** для категориальных данных

### 3. **Visualization** (Визуализация)
Автоматическое определение типа графика на основе запроса:
- **Histogram** (гистограммы распределения)
- **Heatmap** (тепловые карты корреляций)
- **Scatter Plot** (точечные диаграммы)
- **Box Plot** (ящики с усами)
- **Bar Chart** (столбчатые диаграммы)
- **Line Plot** (линейные графики тренда)

---

## 🔧 Technical Implementation

### Intent Classification

**Intent**: `DATA_ANALYSIS`

**Trigger Keywords** (семантический анализ LLM):
- "статистика", "статистический анализ"
- "группировка", "сгруппируй", "group by"
- "визуализация", "график", "chart", "plot"
- "корреляция", "correlation"
- "среднее", "медиана", "mean", "median"

**Examples**:
```
✅ "Посчитай статистику по этим данным"
✅ "Построй график корреляции"
✅ "Сгруппируй данные по категориям"
✅ "Покажи гистограмму распределения цен"
✅ "Среднее значение по группам"
```

### Node: `pandas_analysis_node`

**Location**: `backend/apps/chat/nodes/data_analysis_nodes.py`

**Input**:
- `state.context['data_for_analysis']` - List[Dict] с данными
- `state.table_data` - Fallback если `data_for_analysis` не задан
- `state.query` - Запрос пользователя для определения типа анализа

**Output**:
- `state.result` - Текстовое описание результатов
- `state.image_url` - Base64-encoded график (если визуализация)
- `state.images` - Список изображений
- `state.metadata` - Метаданные анализа

---

## 📦 Service Class: `DataAnalysisService`

### Methods

#### 1. `analyze_data(data, query)` 
Главный метод анализа данных.

**Returns**:
```python
{
    'dataframe_info': {...},      # Информация о DataFrame
    'statistics': {...},           # Статистические показатели
    'grouped_data': {...},         # Результаты группировки
    'visualization': "data:image/png;base64,...",  # График
    'summary_text': "..."         # Текстовое резюме
}
```

#### 2. `_statistical_analysis(df)`
Вычисляет статистику для числовых столбцов.

**Returns**:
```python
{
    'column_name': {
        'count': 100,
        'mean': 45.2,
        'median': 42.0,
        'std': 12.5,
        'min': 10.0,
        'max': 90.0,
        'q25': 30.0,
        'q75': 60.0
    },
    'correlation_matrix': {...}
}
```

#### 3. `_group_data(df, query)`
Группирует данные с агрегацией.

**Returns**:
```python
{
    'grouped_by': 'category',
    'numeric_columns': ['price', 'quantity'],
    'aggregation': ['mean', 'sum', 'count', 'min', 'max'],
    'results': {...}
}
```

#### 4. `_create_visualization(df, query)`
Создает визуализацию на основе данных и запроса.

**Returns**: Base64-encoded PNG image string.

**Chart Types Detection**:
- "гистограмм" / "histogram" → Histogram
- "тепловая" / "heatmap" / "корреля" → Correlation Heatmap
- "scatter" / "точечн" → Scatter Plot
- "box" / "ящик" → Box Plot
- Default → Bar Chart or Line Plot

---

## 🚀 Usage Examples

### Example 1: Statistical Analysis

**User Query**:
```
"Посчитай статистику по ценам"
```

**Data** (from crawler or other source):
```python
[
    {"name": "Product 1", "price": 100.0, "category": "A"},
    {"name": "Product 2", "price": 150.0, "category": "B"},
    {"name": "Product 3", "price": 120.0, "category": "A"},
    ...
]
```

**Response**:
```
📈 Статистический анализ:

**price:**
  • Среднее: 123.33
  • Медиана: 120.00
  • Std: 25.17
  • Min: 100.00, Max: 150.00
  • Q25: 110.00, Q75: 135.00
```

---

### Example 2: Data Grouping

**User Query**:
```
"Сгруппируй по категориям"
```

**Response**:
```
🔢 Группировка по 'category':

  • A: 15 items
  • B: 10 items
  • C: 8 items
```

---

### Example 3: Visualization

**User Query**:
```
"Построй график корреляции между ценой и количеством"
```

**Response**:
- Текстовое описание результатов
- **Изображение**: Correlation heatmap (seaborn)

---

## 🔗 Integration Points

### 1. Graph Integration (`graph.py`)

```python
# Node добавлен в граф:
"data_analysis": pandas_analysis_node

# Routing:
Intent.DATA_ANALYSIS: "data_analysis"

# Edge to output:
graph.add_edge("data_analysis", "output")
```

### 2. Classifier Integration (`intelligent_classifier.py`)

```python
# Intent описан в system instructions:
- DATA_ANALYSIS: Statistical analysis, data grouping, 
                 visualization with pandas/seaborn

# Examples added:
- "Посчитай статистику по этим данным" → DATA_ANALYSIS + HISTORICAL
- "Построй график корреляции" → DATA_ANALYSIS + HISTORICAL
- "Сгруппируй данные по категориям" → DATA_ANALYSIS + HISTORICAL
```

### 3. Data Flow

```
1. User Query → Intent Classification (DATA_ANALYSIS)
2. Route to `pandas_analysis_node`
3. Extract data from state.context or state.table_data
4. Perform analysis (statistics, grouping, visualization)
5. Return results (text + image if applicable)
6. Send to user via WebSocket
```

---

## 🎨 Visualization Styling

**Seaborn Theme**: `whitegrid`  
**Palette**: `husl` (vibrant colors)  
**Figure Size**: `10x6` inches  
**DPI**: 100

**Chart Features**:
- Annotated heatmaps (values displayed)
- Labeled axes
- Titles and legends
- Tight layout for better presentation

---

## ⚙️ Configuration

**Dependencies** (уже установлены):
- `pandas ^2.2.0` - DataFrames and data manipulation
- `seaborn ^0.13.2` - Statistical visualizations
- `matplotlib ^3.10.3` - Plotting backend
- `numpy ^2.2.6` - Numerical operations

**Model Used** (for classification):
- Intent classification via `intelligent_classifier` (LLM-based)

---

## 📝 Notes

- **Non-interactive backend**: `matplotlib.use('Agg')` для серверного рендеринга
- **Base64 encoding**: Графики передаются как data URLs
- **Intelligent column detection**: Автоматический выбор столбцов для группировки
- **Error handling**: Graceful degradation с fallback на текстовые результаты

---

## 🔮 Future Enhancements

- [ ] Support for time series analysis
- [ ] Custom color palettes based on user preferences
- [ ] Advanced statistical tests (t-test, ANOVA, chi-square)
- [ ] Multi-chart compositions (subplots)
- [ ] Interactive plots with Plotly
- [ ] Export to CSV/Excel
- [ ] Data cleaning and preprocessing tools
- [ ] Machine learning predictions (linear regression, clustering)

---

**Created**: 2025-10-24  
**Author**: AI Assistant  
**Version**: 1.0

