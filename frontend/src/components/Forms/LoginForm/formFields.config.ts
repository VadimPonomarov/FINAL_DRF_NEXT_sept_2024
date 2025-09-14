import { FormFieldsConfig } from "@/common/interfaces/forms.interfaces";
import { IDummyAuth } from "@/common/interfaces/dummy.interfaces";
import { IBackendAuthCredentials } from "@/common/interfaces/auth.interfaces";

export const dummyFormFields: FormFieldsConfig<IDummyAuth>[] = [
    {
        name: "username",
        label: "Username",
        type: "text",
    },
    {
        name: "password",
        label: "Password",
        type: "password",
    },
    {
        name: "expiresInMins",
        label: "Session Duration (minutes)",
        type: "select",
        options: [
            { value: "30", label: "30 minutes" },
            { value: "60", label: "60 minutes" }
        ]
    }
];

export const backendFormFields: FormFieldsConfig<IBackendAuthCredentials>[] = [
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
];