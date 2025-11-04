import {FieldErrors, UseFormRegister} from "react-hook-form";
import {FormFieldsConfig} from "@/shared/types/forms.interfaces.ts";

export interface FormFieldsRendererProps<T> {
    errors: FieldErrors<T>;
    fields: FormFieldsConfig<T>[] | FormFieldsConfig<T>;
    item?: T | null;
    register: UseFormRegister<T>;
}