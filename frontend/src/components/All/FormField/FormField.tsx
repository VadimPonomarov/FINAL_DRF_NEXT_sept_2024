import React from "react";
import { FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldProps } from "@/shared/types/forms.interfaces";
import { cn } from "@/lib/utils";

const FormField = <T extends FieldValues>({
    name,
    label,
    register,
    errors,
    type = "text",
                                            inputClassName // Добавляем новое свойство
}: FormFieldProps<T>) => {
    // Правильная типизация для доступа к сообщению об ошибке
    const fieldError = errors[name];
    const errorMessage = fieldError && typeof fieldError === 'object' && 'message' in fieldError
        ? fieldError.message as string
        : undefined;

    return (
        <div className="space-y-2">
            <Label 
                htmlFor={String(name)}
                className="text-sm font-medium"
                style={{ color: 'var(--dropdown-text)' }}
            >
                {label}
            </Label>
            <Input 
                {...register(name)} 
                id={String(name)} 
                type={type}
                className={cn(
                    "w-full rounded-md px-4 py-2 text-sm transition-colors duration-300 focus:ring-2 focus:ring-opacity-20",
                    inputClassName // Применяем переданные стили
                )}
                style={{ 
                    backgroundColor: 'var(--dropdown-bg)',
                    color: inputClassName ? undefined : 'var(--dropdown-text)', // Используем цвет из className, если он передан
                    border: 'none',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
            />
            {errorMessage && (
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
            )}
        </div>
    );
};

export default FormField;
