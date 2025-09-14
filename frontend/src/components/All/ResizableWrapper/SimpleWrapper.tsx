"use client"
import React, { FC } from "react";

interface SimpleWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  storageKey?: string;
  centered?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SimpleWrapper: FC<SimpleWrapperProps> = ({
  children,
  storageKey = 'chat',
  centered = true,
  className = '',
  style = {}
}) => {
    // Простая статическая версия без resize функциональности
    const wrapperStyle: React.CSSProperties = {
        position: 'relative',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        minWidth: '200px',
        minHeight: '150px',
        width: '400px',
        height: 'auto',
        ...style
    };

    const containerStyle: React.CSSProperties = centered ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
    } : {};

    return (
        <div style={containerStyle}>
            <div
                className={className}
                style={wrapperStyle}
            >
                {children}
            </div>
        </div>
    );
};

export default SimpleWrapper;
