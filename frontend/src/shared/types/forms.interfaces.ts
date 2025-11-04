import { FieldValues, Path, UseFormRegister, FieldErrors } from "react-hook-form";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormFieldsConfig<T extends FieldValues> {
  name: keyof T;
  label: string;
  type: string;
  options?: SelectOption[];
  validation?: Record<string, unknown>;
}

export interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  type?: string;
  options?: SelectOption[];
  inputClassName?: string;
}


