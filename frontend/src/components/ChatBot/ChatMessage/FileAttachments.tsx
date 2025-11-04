"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { FileAttachment } from "@/modules/chatbot/chat/chatTypes";
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
    <div className={unifiedStyles.fileAttachments}>
      {resultFileUrl && (
        <div className={unifiedStyles.fileResult}>
          <div className={unifiedStyles.fileResultHeader}>
            <FileText className="h-5 w-5" />
            <span>Result File</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className={unifiedStyles.downloadButton}
            onClick={() => window.open(resultFileUrl, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Result
          </Button>
        </div>
      )}
      
      {files?.length > 0 && (
        <div className={unifiedStyles.filesContainer}>
          <div className={unifiedStyles.filesHeader}>
            <span>Attached Files ({files.length})</span>
          </div>
          <div className={unifiedStyles.filesList}>
            {files.map((file) => (
              <div key={file.file_id} className={unifiedStyles.fileItem}>
                <div className={unifiedStyles.fileInfo}>
                  {getFileIcon(file.file_type)}
                  <span className={unifiedStyles.fileName}>{file.file_name}</span>
                  <span className={unifiedStyles.fileSize}>({(file.file_size / 1024).toFixed(1)} KB)</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={unifiedStyles.fileActionButton}
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
