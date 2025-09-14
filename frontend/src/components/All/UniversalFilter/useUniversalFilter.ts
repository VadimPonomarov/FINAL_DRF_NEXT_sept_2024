import React, { useEffect, useState, useCallback } from "react";

import { IProps } from "./index.interfaces";

const useUniversalFilter = <T>({ cb }: IProps<T>) => {
  const [inputValues, setInputValues] = useState<{ [key in keyof T]?: string }>(
    {},
  );
  const [debouncedInputValues, setDebouncedInputValues] = useState<{ [key in keyof T]?: string }>(
    {},
  );

  // Дебаунс для инпутов
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputValues(inputValues);
    }, 500); // Увеличиваем задержку до 500ms для лучшего UX

    return () => {
      clearTimeout(timer);
    };
  }, [inputValues]);

  // Вызываем коллбэк только после дебаунса
  useEffect(() => {
    if (cb) {
      cb(debouncedInputValues);
    }
  // eslint-disable-next-line
  }, [debouncedInputValues]);

  const handleInputChange = useCallback((key: keyof T, value: string) => {
    setInputValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleReset = useCallback(() => {
    setInputValues({});
    setDebouncedInputValues({});
    // Немедленно вызываем коллбэк с пустыми значениями
    if (cb) {
      cb({});
    }
  }, [cb]);

  return {
    inputValues,
    handleInputChange,
    handleFocus,
    handleReset,
  };
};

export default useUniversalFilter;
