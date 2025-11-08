import { FormFieldsConfig } from "@/shared/types/forms.interfaces";
import { IDummyAuth } from "@/shared/types/dummy.interfaces";
import { IBackendAuthCredentials } from "@/shared/types/auth.interfaces";

// These will be translated in the component using useI18n hook
// Labels and placeholders are set dynamically in LoginForm component
export const dummyFormFields: FormFieldsConfig<IDummyAuth>[] = [
    {
        name: "username",
        label: "auth.username", // Translation key
        type: "text",
        placeholder: "auth.usernamePlaceholder", // Translation key
    },
    {
        name: "password",
        label: "auth.password", // Translation key
        type: "password",
        placeholder: "auth.passwordPlaceholder", // Translation key
    },
    {
        name: "expiresInMins",
        label: "auth.sessionDuration", // Translation key
        type: "select",
        options: [
            { value: "30", label: "30" }, // Will be combined with minutes translation in FormFieldsRenderer
            { value: "60", label: "60" } // Will be combined with minutes translation in FormFieldsRenderer
        ]
    }
];

export const backendFormFields: FormFieldsConfig<IBackendAuthCredentials>[] = [
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
];