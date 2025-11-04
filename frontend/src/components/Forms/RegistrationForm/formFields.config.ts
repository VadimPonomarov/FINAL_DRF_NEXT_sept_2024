import { FormFieldsConfig } from "@/shared/types/forms.interfaces";
import { IRegistration } from "@/shared/types/auth.interfaces";

export const formFields: FormFieldsConfig<IRegistration>[] = [
    {
        name: "email",
        label: "Email",
        type: "email",
    },
    {
        name: "password",
        label: "Password",
        type: "password",
    },
    {
        name: "confirmPassword",
        label: "Confirm Password",
        type: "password",
    },
] as const;