"use client";

export const filterItems = <T>(
    items: T[],
    inputValues: { [key in keyof T]?: string }
): T[] => {
    // Фильтруем только если есть значения для фильтрации
    const hasFilterValues = Object.values(inputValues).some(value => value && value.trim() !== '');
    if (!hasFilterValues) return items;

    return items.filter(item =>
        Object.keys(inputValues).every(key => {
            const inputValue = inputValues[key as keyof T];

            // Если значение фильтра пустое, считаем что фильтр прошел
            if (!inputValue || inputValue.trim() === '') return true;

            const itemValue = item[key as keyof T];

            // Обработка числовых значений
            if (typeof itemValue === "number") {
                // Для всех числовых полей используем точное совпадение
                const inputValueStr = String(inputValue).trim();

                // Проверяем, что введенное значение является числом
                if (!/^\d+$/.test(inputValueStr)) {
                    return false; // Если введено не число, то фильтр не проходит
                }

                // Точное совпадение числовых значений
                return Number(inputValueStr) === itemValue;
            }
            // Обработка массивов (например, тегов)
            else if (Array.isArray(itemValue)) {
                return itemValue.some(val =>
                    new RegExp(inputValue, "i").test(String(val))
                );
            }
            // Обработка строковых значений
            else {
                return new RegExp(inputValue, "i").test(String(itemValue));
            }
        })
    );
};
