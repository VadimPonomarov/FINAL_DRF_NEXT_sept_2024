"use client";

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface ImageSkeletonProps {
  message?: string;
}

export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
  message = "Генерация изображения..."
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.skeletonWrapper}>
        <Skeleton className={unifiedStyles.imageSkeleton} />
        <div className={styles.overlay}>
          <ImageIcon className={unifiedStyles.submitButtonIcon} />
          <div className={unifiedStyles.chatMessage}>{message}</div>
          <div className={styles.spinner}></div>
        </div>
      </div>
    </div>
  );
};
