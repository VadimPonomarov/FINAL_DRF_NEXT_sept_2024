/**
 * Dynamic Export Utils - Lazy loading for heavy export libraries
 * Оптимизированные утилиты экспорта с динамической загрузкой
 */

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  title: string;
  period?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
  filters?: Record<string, any>;
}

export interface ExportData {
  summary?: Record<string, any>;
  charts?: Array<{
    title: string;
    data: any;
    type: 'line' | 'bar' | 'pie' | 'doughnut';
  }>;
  tables?: Array<{
    title: string;
    headers: string[];
    rows: any[][];
  }>;
  rawData?: any[];
}

// Динамический импорт для PDF экспорта
export const exportToPDF = async (data: ExportData, options: ExportOptions): Promise<Blob> => {
  // Загружаем jsPDF и html2canvas только когда нужно
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ]);

  const pdf = new jsPDF();
  let yPosition = 20;

  // Добавляем заголовок
  pdf.setFontSize(20);
  pdf.text(options.title, 20, yPosition);
  yPosition += 20;

  // Добавляем период
  if (options.period) {
    pdf.setFontSize(12);
    pdf.text(`Период: ${options.period}`, 20, yPosition);
    yPosition += 15;
  }

  // Добавляем сводку
  if (data.summary) {
    pdf.setFontSize(16);
    pdf.text('Сводка', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    Object.entries(data.summary).forEach(([key, value]) => {
      pdf.text(`${key}: ${value}`, 20, yPosition);
      yPosition += 8;
    });
    yPosition += 10;
  }

  // Добавляем таблицы
  if (data.tables && options.includeRawData) {
    const { default: autoTable } = await import('jspdf-autotable');
    
    data.tables.forEach((table) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text(table.title, 20, yPosition);
      yPosition += 10;

      (pdf as any).autoTable({
        head: [table.headers],
        body: table.rows,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 20;
    });
  }

  return new Blob([pdf.output('blob')], { type: 'application/pdf' });
};

// Динамический импорт для Excel экспорта
export const exportToExcel = async (data: ExportData, options: ExportOptions): Promise<Blob> => {
  // Загружаем xlsx только когда нужно
  const XLSX = await import('xlsx');

  const workbook = XLSX.utils.book_new();

  // Добавляем лист сводки
  if (data.summary) {
    const summaryData = Object.entries(data.summary).map(([key, value]) => [key, value]);
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Параметр', 'Значение'],
      ...summaryData
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Сводка');
  }

  // Добавляем таблицы как отдельные листы
  if (data.tables && options.includeRawData) {
    data.tables.forEach((table, index) => {
      const tableData = [table.headers, ...table.rows];
      const worksheet = XLSX.utils.aoa_to_sheet(tableData);
      
      // Устанавливаем ширину колонок
      const colWidths = table.headers.map(() => ({ wch: 15 }));
      worksheet['!cols'] = colWidths;
      
      const sheetName = table.title.substring(0, 31); // Excel ограничение на имя листа
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
  }

  // Добавляем сырые данные
  if (data.rawData && options.includeRawData) {
    const rawDataSheet = XLSX.utils.json_to_sheet(data.rawData);
    XLSX.utils.book_append_sheet(workbook, rawDataSheet, 'Сырые данные');
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
};

// Экспорт в CSV (легкий, без динамической загрузки)
export const exportToCSV = (data: ExportData, options: ExportOptions): Blob => {
  let csvContent = '';

  // Добавляем заголовок
  csvContent += `${options.title}\n`;
  if (options.period) {
    csvContent += `Период: ${options.period}\n`;
  }
  csvContent += '\n';

  // Добавляем сводку
  if (data.summary) {
    csvContent += 'Сводка\n';
    Object.entries(data.summary).forEach(([key, value]) => {
      csvContent += `${key},${value}\n`;
    });
    csvContent += '\n';
  }

  // Добавляем таблицы
  if (data.tables && options.includeRawData) {
    data.tables.forEach((table) => {
      csvContent += `${table.title}\n`;
      csvContent += `${table.headers.join(',')}\n`;
      table.rows.forEach((row) => {
        csvContent += `${row.join(',')}\n`;
      });
      csvContent += '\n';
    });
  }

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

// Главная функция экспорта с динамической загрузкой
export const exportAnalyticsReport = async (
  data: ExportData, 
  options: ExportOptions
): Promise<Blob> => {
  switch (options.format) {
    case 'pdf':
      return await exportToPDF(data, options);
    case 'excel':
      return await exportToExcel(data, options);
    case 'csv':
      return exportToCSV(data, options);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
};

// Утилиты валидации
export class ExportUtils {
  static validateExportData(data: ExportData): boolean {
    if (!data) return false;
    
    // Проверяем, что есть хотя бы один тип данных
    return !!(data.summary || data.charts || data.tables || data.rawData);
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static generateFileName(options: ExportOptions): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const sanitizedTitle = options.title.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitizedTitle}_${timestamp}.${options.format === 'excel' ? 'xlsx' : options.format}`;
  }
}

// Хук для использования экспорта в компонентах
export const useExport = () => {
  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportData = async (data: ExportData, options: ExportOptions) => {
    try {
      const blob = await exportAnalyticsReport(data, options);
      const filename = ExportUtils.generateFileName(options);
      downloadFile(blob, filename);
      return { success: true, filename, size: ExportUtils.formatFileSize(blob.size) };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  return { exportData, downloadFile };
};
