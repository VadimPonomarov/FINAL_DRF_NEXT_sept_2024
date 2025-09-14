import React from "react";
import { FieldValues, UseFormRegister, FieldErrors, Path } from "react-hook-form";
import { FormFieldsConfig } from "@/common/interfaces/forms.interfaces";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

        return (
          <div key={String(field.name)} className="space-y-2">
            <Label htmlFor={String(field.name)} className="text-sm font-medium text-gray-700">
              {field.label}
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
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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

