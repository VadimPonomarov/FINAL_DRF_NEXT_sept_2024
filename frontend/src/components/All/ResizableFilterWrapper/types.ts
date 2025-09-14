/**
 * Types for ResizableFilterWrapper component
 */
import { ReactNode } from 'react';

export interface ResizableFilterWrapperProps {
  children: ReactNode;
}

export interface FilterPosition {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  margin?: string;
  transform?: string; // Используется для переключения между центрированием и абсолютным позиционированием
}

export interface FilterSize {
  width: string;
  height: string;
}
