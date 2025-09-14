"use client";

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import styles from './styles.module.css';

interface ImageSkeletonProps {
  message?: string;
}

export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
  message = "Генерация изображения..."
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.skeletonWrapper}>
        <Skeleton className={styles.imageSkeleton} />
        <div className={styles.overlay}>
          <ImageIcon className={styles.icon} />
          <div className={styles.message}>{message}</div>
          <div className={styles.spinner}></div>
        </div>
      </div>
    </div>
  );
};
