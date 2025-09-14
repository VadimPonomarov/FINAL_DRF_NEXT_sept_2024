"use client";

import React from 'react';

// Компонент для инжекции дополнительных стилей
const ResponsiveAnalyticsStyles: React.FC = () => {
  React.useEffect(() => {
    // Добавляем дополнительные стили для улучшенной адаптивности
    const style = document.createElement('style');
    style.textContent = `
      /* Улучшенная адаптивность для аналитики */
      @media (max-width: 480px) {
        .analytics-mobile-compact .container {
          padding-left: 0.75rem !important;
          padding-right: 0.75rem !important;
        }
        
        .analytics-mobile-compact .space-y-6 > * + * {
          margin-top: 1rem !important;
        }
        
        .analytics-mobile-compact .gap-6 {
          gap: 0.75rem !important;
        }
        
        .analytics-mobile-compact .text-3xl {
          font-size: 1.5rem !important;
          line-height: 2rem !important;
        }
        
        .analytics-mobile-compact .text-2xl {
          font-size: 1.25rem !important;
          line-height: 1.75rem !important;
        }
        
        .analytics-mobile-compact .h-80 {
          height: 12rem !important;
        }
        
        .analytics-mobile-compact .h-96 {
          height: 14rem !important;
        }
      }
      
      /* Планшеты в портретной ориентации */
      @media (min-width: 481px) and (max-width: 768px) {
        .analytics-tablet .grid-cols-2 {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        
        .analytics-tablet .lg\\:grid-cols-4 {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      
      /* Планшеты в альбомной ориентации */
      @media (min-width: 769px) and (max-width: 1024px) {
        .analytics-tablet-landscape .xl\\:grid-cols-2 {
          grid-template-columns: repeat(1, 1fr) !important;
        }
      }
      
      /* Улучшения для touch устройств */
      @media (hover: none) and (pointer: coarse) {
        .analytics-touch .hover\\:scale-105:hover {
          transform: none !important;
        }
        
        .analytics-touch .hover\\:shadow-xl:hover {
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
        }
        
        .analytics-touch button,
        .analytics-touch [role="button"] {
          min-height: 44px !important;
          min-width: 44px !important;
        }
      }
      
      /* Высокие экраны (например, современные смартфоны) */
      @media (max-width: 480px) and (min-height: 800px) {
        .analytics-tall-mobile .space-y-4 > * + * {
          margin-top: 1.5rem !important;
        }
        
        .analytics-tall-mobile .h-64 {
          height: 18rem !important;
        }
      }
      
      /* Широкие экраны */
      @media (min-width: 1920px) {
        .analytics-wide .max-w-7xl {
          max-width: 90rem !important;
        }
        
        .analytics-wide .container {
          padding-left: 2rem !important;
          padding-right: 2rem !important;
        }
      }
      
      /* Темная тема для аналитики */
      @media (prefers-color-scheme: dark) {
        .analytics-dark .bg-gradient-to-br {
          background: linear-gradient(to bottom right, rgb(15 23 42), rgb(30 41 59), rgb(15 23 42)) !important;
        }
        
        .analytics-dark .bg-white\\/90 {
          background-color: rgb(30 41 59 / 0.9) !important;
        }
        
        .analytics-dark .text-gray-900 {
          color: rgb(248 250 252) !important;
        }
        
        .analytics-dark .border-blue-200 {
          border-color: rgb(59 130 246 / 0.3) !important;
        }
      }
      
      /* Анимации для лучшего UX */
      .analytics-animated .kpi-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .analytics-animated .chart-placeholder {
        transition: all 0.2s ease-in-out !important;
      }
      
      .analytics-animated .chart-placeholder:hover {
        transform: translateY(-2px) !important;
      }
      
      /* Улучшенная типографика */
      .analytics-typography .font-bold {
        font-weight: 700 !important;
        letter-spacing: -0.025em !important;
      }
      
      .analytics-typography .font-medium {
        font-weight: 500 !important;
        letter-spacing: -0.01em !important;
      }
      
      /* Улучшенные тени */
      .analytics-shadows .shadow-lg {
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.05) !important;
      }
      
      .analytics-shadows .shadow-xl {
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.05) !important;
      }
      
      /* Улучшенные градиенты */
      .analytics-gradients .bg-gradient-to-br {
        background-size: 200% 200% !important;
        animation: gradientShift 10s ease infinite !important;
      }
      
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      /* Улучшенная доступность */
      .analytics-a11y .focus\\:ring-2:focus {
        ring-width: 2px !important;
        ring-color: rgb(59 130 246) !important;
        ring-offset-width: 2px !important;
      }
      
      .analytics-a11y .focus\\:outline-none:focus {
        outline: 2px solid transparent !important;
        outline-offset: 2px !important;
      }
      
      /* Высокий контраст */
      @media (prefers-contrast: high) {
        .analytics-high-contrast .text-blue-600 {
          color: rgb(29 78 216) !important;
        }
        
        .analytics-high-contrast .text-green-600 {
          color: rgb(22 163 74) !important;
        }
        
        .analytics-high-contrast .border {
          border-width: 2px !important;
        }
      }
      
      /* Уменьшенная анимация */
      @media (prefers-reduced-motion: reduce) {
        .analytics-reduced-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    // Добавляем классы к body для активации стилей
    const body = document.body;
    body.classList.add(
      'analytics-mobile-compact',
      'analytics-tablet',
      'analytics-tablet-landscape',
      'analytics-touch',
      'analytics-tall-mobile',
      'analytics-wide',
      'analytics-dark',
      'analytics-animated',
      'analytics-typography',
      'analytics-shadows',
      'analytics-gradients',
      'analytics-a11y',
      'analytics-high-contrast',
      'analytics-reduced-motion'
    );
    
    return () => {
      document.head.removeChild(style);
      body.classList.remove(
        'analytics-mobile-compact',
        'analytics-tablet',
        'analytics-tablet-landscape',
        'analytics-touch',
        'analytics-tall-mobile',
        'analytics-wide',
        'analytics-dark',
        'analytics-animated',
        'analytics-typography',
        'analytics-shadows',
        'analytics-gradients',
        'analytics-a11y',
        'analytics-high-contrast',
        'analytics-reduced-motion'
      );
    };
  }, []);
  
  return null;
};

export default ResponsiveAnalyticsStyles;
