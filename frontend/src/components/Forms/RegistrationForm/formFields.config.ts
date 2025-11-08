import { FormFieldsConfig } from "@/shared/types/forms.interfaces";
import { IRegistration } from "@/shared/types/auth.interfaces";

// These will be translated in the component using useI18n hook
// Labels and placeholders are set dynamically in RegistrationForm component
export const formFields: FormFieldsConfig<IRegistration>[] = [
    {
        name: "email",
        label: "auth.email", // Translation key
        type: "email",
        placeholder: "auth.emailPlaceholder", // Translation key
    },
    {
        name: "password",
        label: "auth.password", // Translation key
        type: "password",
        placeholder: "auth.passwordPlaceholder", // Translation key
    },
    {
        name: "confirmPassword",
        label: "auth.confirmPassword", // Translation key
        type: "password",
        placeholder: "auth.confirmPasswordPlaceholder", // Translation key
    },
] as const;