import { useEffect } from 'react';

interface ConsoleError {
  message: string;
  stack?: string;
}

/**
 * Хук для подавления предупреждений React о дублирующихся ключах
 */
export const useSuppressReactWarnings = () => {
  useEffect(() => {
    // Сохраняем оригинальную функцию console.error
    const originalError = console.error;
    
    // Заменяем console.error на функцию, которая фильтрует предупреждения о дублирующихся ключах
    console.error = (...args: (string | ConsoleError)[]) => {
      // Проверяем, содержит ли сообщение об ошибке текст о дублирующихся ключах
      if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is no longer supported')) {
        // Игнорируем это предупреждение
        return;
      }
      
      // Для всех остальных ошибок вызываем оригинальную функцию
      originalError.apply(console, args);
    };
    
    // Восстанавливаем оригинальную функцию при размонтировании компонента
    return () => {
      console.error = originalError;
    };
  }, []);
};
