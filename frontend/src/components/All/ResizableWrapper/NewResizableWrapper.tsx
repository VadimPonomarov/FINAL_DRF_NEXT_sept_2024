"use client"
import React, { FC, useRef, useState, useEffect } from "react";

interface NewResizableWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  storageKey?: string;
  centered?: boolean;
  className?: string;
  style?: React.CSSProperties;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

const NewResizableWrapper: FC<NewResizableWrapperProps> = ({
  children,
  storageKey = 'resizable-wrapper',
  centered = true,
  className = '',
  style = {},
  minWidth = 200,
  minHeight = 150,
  defaultWidth = 400,
  defaultHeight = 300
}) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });

    // Загрузка сохраненного размера при монтировании
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedSize = localStorage.getItem(`wrapper-size-${storageKey}`);
                if (savedSize) {
                    const parsed = JSON.parse(savedSize);
                    setSize({
                        width: Math.max(parsed.width || defaultWidth, minWidth),
                        height: Math.max(parsed.height || defaultHeight, minHeight)
                    });
                }
            } catch (error) {
                console.warn('Failed to load saved size:', error);
            }
        }
    }, [storageKey, defaultWidth, defaultHeight, minWidth, minHeight]);

    // Сохранение размера
    const saveSize = (newSize: { width: number; height: number }) => {
        try {
            localStorage.setItem(`wrapper-size-${storageKey}`, JSON.stringify(newSize));
        } catch (error) {
            console.warn('Failed to save size:', error);
        }
    };

    // Обработчик начала изменения размера
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        setIsResizing(true);
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = size.width;
        const startHeight = size.height;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            
            const newWidth = Math.max(startWidth + deltaX, minWidth);
            const newHeight = Math.max(startHeight + deltaY, minHeight);
            
            setSize({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            saveSize(size);
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            // Восстановление стилей
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        // Предотвращение выделения текста
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'nw-resize';
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Стили для контейнера
    const containerStyle: React.CSSProperties = centered ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
    } : {};

    // Стили для wrapper'а
    const wrapperStyle: React.CSSProperties = {
        position: 'relative',
        width: `${size.width}px`,
        height: `${size.height}px`,
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`,
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        backgroundColor: 'white',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        ...style
    };

    return (
        <div style={containerStyle}>
            <div
                ref={wrapperRef}
                className={className}
                style={wrapperStyle}
            >
                {children}
                
                {/* Resize handle */}
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '20px',
                        height: '20px',
                        cursor: 'nw-resize',
                        background: 'linear-gradient(-45deg, transparent 0%, transparent 40%, #cbd5e1 40%, #cbd5e1 60%, transparent 60%)',
                        borderBottomRightRadius: '12px',
                        opacity: isResizing ? 1 : 0.6,
                        transition: 'opacity 0.2s ease'
                    }}
                    title="Drag to resize"
                />
                
                {/* Resize indicator */}
                {isResizing && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            pointerEvents: 'none'
                        }}
                    >
                        {size.width} × {size.height}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewResizableWrapper;
