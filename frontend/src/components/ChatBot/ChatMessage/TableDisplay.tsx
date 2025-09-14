"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Table, ExternalLink } from "lucide-react";
import { FileAttachment } from "@/utils/chat/chatTypes";
import styles from './styles.module.css';

interface TableDisplayProps {
  tableHtml?: string;
  tableData?: Array<Record<string, any>>;
  title?: string;
  files?: FileAttachment[];
}

export const TableDisplay: React.FC<TableDisplayProps> = ({
  tableHtml,
  tableData,
  title = "Таблица данных",
  files = []
}) => {
  if (!tableHtml && !tableData) return null;

  const handleDownload = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return '📊';
    } else if (fileType.includes('csv')) {
      return '📄';
    } else {
      return '📁';
    }
  };

  return (
    <Card className="w-full mt-4 border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Table className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {/* HTML таблица */}
        {tableHtml && (
          <div
            className="overflow-auto max-h-96 border rounded-lg bg-white"
            dangerouslySetInnerHTML={{ __html: tableHtml }}
            style={{
              maxWidth: '100%',
              fontSize: '14px'
            }}
          />
        )}

        {/* JSON данные как fallback */}
        {!tableHtml && tableData && (
          <div className="overflow-auto max-h-96 border rounded-lg bg-gray-50 p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-100">
                  {Object.keys(tableData[0] || {}).map((key) => (
                    <th key={key} className="text-left p-2 font-semibold">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex} className="p-2">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Кнопки скачивания файлов */}
        {files.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {files.filter(file =>
                file.file_type.includes('excel') ||
                file.file_type.includes('spreadsheet') ||
                file.file_type.includes('csv')
              ).map((file, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-sm"
                  onClick={() => handleDownload(file.file_url)}
                  title={`Скачать ${file.file_name}`}
                >
                  <span className="text-base">{getFileIcon(file.file_type)}</span>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {file.file_name.split('.').pop()?.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({(file.file_size / 1024).toFixed(1)} KB)
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Информация о данных */}
        {(tableData || tableHtml) && (
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-4">
            {tableData && (
              <>
                <span>📊 Записей: {tableData.length}</span>
                <span>📋 Колонок: {Object.keys(tableData[0] || {}).length}</span>
              </>
            )}
            <span>🕒 Обновлено: {new Date().toLocaleString('ru-RU')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
