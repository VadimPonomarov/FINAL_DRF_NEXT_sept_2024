import {FieldErrors, UseFormRegister} from "react-hook-form";
import {FormFieldsConfig} from "@/common/interfaces/forms.interfaces.ts";

export interface FormFieldsRendererProps<T> {
    errors: FieldErrors<T>;
    fields: FormFieldsConfig<T>[] | FormFieldsConfig<T>;
    item?: T | null;
    register: UseFormRegister<T>;
}