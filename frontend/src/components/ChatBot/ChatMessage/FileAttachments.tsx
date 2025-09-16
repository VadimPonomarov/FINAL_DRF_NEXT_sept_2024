"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { FileAttachment } from "@/utils/chat/chatTypes";
import { Download, FileText, Image, File, ExternalLink } from "lucide-react";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface FileAttachmentsProps {
  files: FileAttachment[];
  resultFileUrl?: string;
}

export const FileAttachments: React.FC<FileAttachmentsProps> = ({ 
  files, 
  resultFileUrl 
}) => {
  if (!files?.length && !resultFileUrl) return null;

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const handleDownload = (file: FileAttachment) => {
    window.open(file.file_url, '_blank');
  };

  return (
    <div className={styles.fileAttachmentsContainer}>
      {resultFileUrl && (
        <div className={styles.resultFileContainer}>
          <div className={styles.resultFileHeader}>
            <FileText className="h-5 w-5" />
            <span>Result File</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className={styles.downloadButton}
            onClick={() => window.open(resultFileUrl, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Result
          </Button>
        </div>
      )}
      
      {files?.length > 0 && (
        <div className={styles.filesContainer}>
          <div className={styles.filesHeader}>
            <span>Attached Files ({files.length})</span>
          </div>
          <div className={styles.filesList}>
            {files.map((file) => (
              <div key={file.file_id} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  {getFileIcon(file.file_type)}
                  <span className={styles.fileName}>{file.file_name}</span>
                  <span className={styles.fileSize}>({(file.file_size / 1024).toFixed(1)} KB)</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={styles.fileActionButton}
                  onClick={() => handleDownload(file)}
                  title="Download file"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
