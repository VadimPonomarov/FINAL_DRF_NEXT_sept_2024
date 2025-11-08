import React from "react";
import { FieldValues, UseFormRegister, FieldErrors, Path } from "react-hook-form";
import { FormFieldsConfig } from "@/shared/types/forms.interfaces";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface FormFieldsRendererProps<T extends FieldValues> {
  fields: FormFieldsConfig<T>[];
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  inputClassName?: string;
  defaultValues?: Partial<T>;
}

const FormFieldsRenderer = <T extends FieldValues>({
  fields,
  register,
  errors,
  inputClassName,
  defaultValues
}: FormFieldsRendererProps<T>) => {
  const { t } = useI18n();
  
  return (
    <>
      {fields.map((field) => {
        // Convert field.name to string to use as Path<T>
        const fieldName = String(field.name) as Path<T>;
        const error = errors[fieldName];
        const defaultValue = defaultValues ? defaultValues[field.name] : undefined;
        
        // Safely extract error message
        const errorMessage = error && typeof error === 'object' && 'message' in error
          ? error.message as string
          : undefined;

        // Translate label and placeholder if they are translation keys
        const label = field.label && field.label.includes('.') 
          ? t(field.label, field.label) 
          : field.label;
        const placeholder = field.placeholder && field.placeholder.includes('.')
          ? t(field.placeholder, field.placeholder)
          : field.placeholder;

        return (
          <div key={String(field.name)} className="space-y-2">
            <Label htmlFor={String(field.name)} className="text-sm font-medium text-gray-700">
              {label}
            </Label>

            {field.type === "select" ? (
              <Select 
                defaultValue={defaultValue as string} 
                onValueChange={(value) => {
                  // This is a workaround for react-hook-form with controlled components
                  const event = {
                    target: { name: String(field.name), value }
                  } as React.ChangeEvent<HTMLSelectElement>;
                  register(fieldName).onChange(event);
                }}
              >
                <SelectTrigger className={cn("w-full", error && "border-red-500")}>
                  <SelectValue placeholder={placeholder || `Select ${label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => {
                    // Translate option labels if they are translation keys
                    let optionLabel = option.label;
                    if (option.label && typeof option.label === 'string') {
                      if (option.label.includes('.')) {
                        optionLabel = t(option.label, option.label);
                      } else if (field.name === 'expiresInMins') {
                        // Special handling for session duration: combine number with "minutes" translation
                        optionLabel = `${option.label} ${t('auth.minutes', 'minutes')}`;
                      }
                    }
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        {optionLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={String(field.name)}
                type={field.type}
                className={cn(
                  inputClassName,
                  error && "border-red-500 focus:ring-red-500"
                )}
                {...register(fieldName)}
                defaultValue={defaultValue as string}
                placeholder={placeholder}
              />
            )}

            {errorMessage && (
              <p className="text-xs text-red-500 mt-1">
                {errorMessage}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
};

export default FormFieldsRenderer;

