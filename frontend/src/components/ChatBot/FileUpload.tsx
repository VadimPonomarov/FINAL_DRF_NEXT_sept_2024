"use client";

import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileToBase64 } from "@/utils/chat/fileUpload";
import { useErrorHandler, ErrorType } from "@/utils/ui/notificationUtils";
import { useNotification } from "@/contexts/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface FileUploadProps {
  onFilesSelected: (files: File[], message?: string) => Promise<void>;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  disabled = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleError, showSuccess, showInfo } = useErrorHandler();
  const { clearAllNotifications } = useNotification();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);

      // Проверка размера файлов
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
      const validFiles = [];
      const invalidFiles = [];

      for (const file of filesArray) {
        if (file.size <= MAX_FILE_SIZE) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file);
        }
      }

      if (invalidFiles.length > 0) {
        const fileNames = invalidFiles.map(f => f.name).join(', ');
        console.warn(`Files exceed maximum size: ${fileNames}`);
        handleError(`Следующие файлы превышают максимальный размер 10 МБ: ${fileNames}`, {
          type: 'validation',
          prefix: 'Ошибка размера файла'
        });
      }

      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      console.log(`Uploading ${selectedFiles.length} files...`);

      // Детальная информация о файлах
      selectedFiles.forEach((file, index) => {
        console.log(`File ${index + 1}/${selectedFiles.length}:`, {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString()
        });
      });

      // Дополнительная проверка типов файлов
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      // Проверка на пустые файлы
      const emptyFiles = selectedFiles.filter(file => file.size === 0);
      if (emptyFiles.length > 0) {
        const fileNames = emptyFiles.map(f => f.name).join(', ');
        console.error(`Empty files detected: ${fileNames}`);
        alert(`Обнаружены пустые файлы: ${fileNames}`);
        setIsUploading(false);
        return;
      }

      const invalidTypeFiles = selectedFiles.filter(file => !allowedTypes.includes(file.type));

      if (invalidTypeFiles.length > 0) {
        const fileNames = invalidTypeFiles.map(f => `${f.name} (${f.type})`).join(', ');
        console.error(`Invalid file types: ${fileNames}`);
        alert(`Неподдерживаемые типы файлов: ${fileNames}\nРазрешены только: PDF, JPG, JPEG, PNG, DOC, DOCX, TXT`);
        setIsUploading(false);
        return;
      }

      console.log('Starting file upload with message:', message || '(no message)');

      try {
        console.log('Uploading files via WebSocket...');

        // Отправляем файлы напрямую через WebSocket
        await onFilesSelected(selectedFiles, message);

        // Очищаем форму
        setSelectedFiles([]);
        setMessage('');

        // Показываем toast уведомление с автоматическим скрытием через 2 секунды
        toast({
          title: "Успешно",
          description: `Файлы успешно отправлены (${selectedFiles.length})`,
          variant: "default",
          duration: 2000 // 2 секунды
        });
      } catch (error) {
        console.error('Error uploading files via WebSocket:', error);
        // Обрабатываем ошибку с помощью нашего обработчика
        handleError(error, {
          type: ErrorType.NETWORK,
          prefix: 'Ошибка отправки файлов'
        });
      }
    } catch (error) {
      console.error('Error uploading files:', error);

      // Обрабатываем ошибку с помощью нашего обработчика
      const errorResult = handleError(error, {
        type: ErrorType.UNKNOWN,
        prefix: 'Ошибка загрузки файлов'
      });

      // Отправляем сообщение об ошибке через WebSocket
      try {
        onFilesSelected([], `Ошибка при загрузке файлов: ${errorResult.message}`);
      } catch (wsError) {
        console.error('Error sending error message via WebSocket:', wsError);
        handleError(wsError, {
          type: ErrorType.NETWORK,
          prefix: 'Ошибка отправки сообщения'
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    const fileType = file.type;
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className={styles.container}>
      {selectedFiles.length > 0 && (
        <div className={styles.fileList}>
          {selectedFiles.map((file, index) => (
            <div key={index} className={styles.fileItem}>
              <div className={styles.fileInfo}>
                {getFileIcon(file)}
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={styles.removeButton}
                onClick={() => handleRemoveFile(index)}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {selectedFiles.length > 0 && (
            <div className={styles.messageInput}>
              <input
                type="text"
                placeholder="Add a message with your files (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={unifiedStyles.chatInputField}
                disabled={isUploading}
              />
            </div>
          )}

          <div className={styles.actions}>
            <Button
              variant="default"
              size="sm"
              onClick={handleSubmit}
              disabled={disabled || isUploading}
              className={styles.sendButton}
            >
              {isUploading ? 'Uploading...' : 'Send Files'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFiles([])}
              disabled={isUploading}
              className={styles.cancelButton}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
        disabled={disabled || isUploading}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className={cn(styles.attachButton, selectedFiles.length > 0 && styles.active)}
        title="Attach files"
      >
        <Paperclip className="h-5 w-5" />
      </Button>
    </div>
  );
};
