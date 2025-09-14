import { NextRequest, NextResponse } from 'next/server';
import { exportAnalyticsReport, ExportOptions, ExportData, ExportUtils } from '@/lib/analytics/export';
import { analyticsCache } from '@/lib/analytics/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      format,
      title = 'Аналитический отчет AutoRia',
      period,
      includeCharts = false,
      includeRawData = true,
      filters = {},
      data
    } = body;

    console.log('[Export API] 📄 Processing export request:', { format, title, period });

    // Валидация параметров
    if (!format || !['pdf', 'excel', 'csv'].includes(format)) {
      return NextResponse.json({
        success: false,
        error: 'Неверный формат экспорта. Поддерживаются: pdf, excel, csv'
      }, { status: 400 });
    }

    if (!data || !ExportUtils.validateExportData(data)) {
      return NextResponse.json({
        success: false,
        error: 'Неверные данные для экспорта'
      }, { status: 400 });
    }

    const exportOptions: ExportOptions = {
      format: format as 'pdf' | 'excel' | 'csv',
      title,
      period: period || 'Не указан',
      includeCharts,
      includeRawData,
      filters
    };

    // Генерируем отчет
    const reportBlob = await exportAnalyticsReport(data, exportOptions);
    
    // Определяем MIME тип
    const mimeTypes = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf'
    };

    const mimeType = mimeTypes[format as keyof typeof mimeTypes];
    const filename = ExportUtils.generateFilename(exportOptions);

    console.log('[Export API] ✅ Report generated successfully:', { filename, size: reportBlob.size });

    // Возвращаем файл
    return new NextResponse(reportBlob, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': reportBlob.size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('[Export API] ❌ Error:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      message: 'Произошла ошибка при экспорте отчета'
    }, { status: 500 });
  }
}

// Получение доступных форматов экспорта
export async function GET(request: NextRequest) {
  try {
    const formats = [
      {
        id: 'csv',
        name: 'CSV',
        description: 'Comma-separated values для работы с таблицами',
        extension: 'csv',
        mimeType: 'text/csv',
        features: ['raw_data', 'kpi_metrics', 'time_series']
      },
      {
        id: 'excel',
        name: 'Excel',
        description: 'Microsoft Excel файл с несколькими листами',
        extension: 'xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        features: ['raw_data', 'kpi_metrics', 'time_series', 'charts', 'formatting']
      },
      {
        id: 'pdf',
        name: 'PDF',
        description: 'Portable Document Format для печати и презентаций',
        extension: 'pdf',
        mimeType: 'application/pdf',
        features: ['formatted_report', 'charts', 'summary']
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        formats,
        default_options: {
          includeCharts: false,
          includeRawData: true,
          title: 'Аналитический отчет AutoRia'
        },
        limits: {
          max_data_points: 10000,
          max_file_size: '50MB'
        }
      }
    });

  } catch (error: any) {
    console.error('[Export API] ❌ Error getting formats:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      message: 'Произошла ошибка при получении форматов экспорта'
    }, { status: 500 });
  }
}
