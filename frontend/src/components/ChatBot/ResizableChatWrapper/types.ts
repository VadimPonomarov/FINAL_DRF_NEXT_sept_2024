/**
 * Types for ResizableChatWrapper component
 */
import { ReactNode } from 'react';

export interface ResizableChatWrapperProps {
  children: ReactNode;
}

export interface ChatPosition {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  margin?: string;
  transform?: string; // Используется для переключения между центрированием и абсолютным позиционированием
}

export interface ChatSize {
  width: string;
  height: string;
}
