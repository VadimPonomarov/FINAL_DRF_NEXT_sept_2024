import { AuthProvider } from "@/common/constants/constants";

// Реэкспортируем AuthProvider для обратной совместимости
export { AuthProvider };

// Интерфейс для ошибок
export interface IAuthError {
    detail?: string;
    email?: string[];
    password?: string[];
    message?: string;
    code?: string;
    [key: string]: unknown;
}

// Интерфейс для входных данных при аутентификации через бэкенд
export interface IBackendAuthCredentials {
  email: string;
  password: string;
}

// Интерфейс для токенов
export interface IBackendAuth {
    access: string;
    refresh: string;
}

// Интерфейс для ответа от сервера при логине
export interface IBackendAuthResponse extends IBackendAuth {
    // email и user теперь опциональные, так как не всегда приходят при логине
    email?: string;
    user?: {
        id: number;
        email: string;
    };
}

// Интерфейс для ответа от сервера Django
export interface IDjangoAuthResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: number;
        username: string;
        email: string;
    };
}

// Type for response with error
export type AuthResponse =
    | (IBackendAuthResponse & { error?: never })
    | { error: IAuthError | string };

// Helper function to convert Django response to our format
export const convertDjangoAuthToBackendAuth = (
    djangoResponse: IDjangoAuthResponse
): IBackendAuthResponse => {
    if (!djangoResponse.user || !djangoResponse.access_token || !djangoResponse.refresh_token) {
        throw new Error("Invalid Django auth response format");
    }

    return {
        access: djangoResponse.access_token,
        refresh: djangoResponse.refresh_token,
        email: djangoResponse.user.email,
        user: {
            id: djangoResponse.user.id,
            email: djangoResponse.user.email
        }
    };
};

export interface IAuthProviderOption {
    value: AuthProvider;
    label: string;
}

export const authProviderOptions: IAuthProviderOption[] = [
    { value: AuthProvider.Dummy, label: "Dummy Auth" },
    { value: AuthProvider.MyBackendDocs, label: "My Backend Docs" }
];

export interface IRegistration {
    email: string;
    password: string;
    confirmPassword: string;
}
