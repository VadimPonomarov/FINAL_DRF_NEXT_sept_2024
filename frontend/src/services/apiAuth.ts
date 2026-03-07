import { IRegistration } from "@/shared/types/auth.interfaces";
import { IUser } from "@/shared/types/users.interfaces";
import { API_ENDPOINTS } from "@/shared/constants/constants";
import { backendUrl } from "@/lib/backend-url";

interface IRegistrationResponse {
    user: IUser;
    message: string;
}
export class ApiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

export const apiAuthService = {
    register: async (data: Pick<IRegistration, 'email' | 'password'>): Promise<IRegistrationResponse> => {
        try {
            const registerUrl = backendUrl(API_ENDPOINTS.auth.register);
            console.log("Sending registration request to:", registerUrl);
            console.log("With data:", { email: data.email, password: "***" });

            const response = await fetch(registerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(data),
                mode: 'cors',
                cache: 'no-store'
            });

            console.log("Registration response status:", response.status);
            
            if (!response.ok) {
                let errorMessage = "Registration failed"; // Error message for failed registration
                try {
                    const errorData = await response.json();
                    console.error("Registration error data:", errorData);
                    
                    // Обработка различных форматов ошибок
                    if (errorData.error_message) {
                        errorMessage = errorData.error_message;
                    } else if (errorData.detail) {
                        errorMessage = errorData.detail;
                    } else if (errorData.email && Array.isArray(errorData.email)) {
                        errorMessage = errorData.email[0];
                    } else if (typeof errorData === 'string') {
                        errorMessage = errorData;
                    }
                } catch (e) {
                    console.error("Error parsing error response:", e);
                }
                
                throw new ApiError(errorMessage);
            }

            const responseData = await response.json();
            console.log("Registration successful:", responseData);
            return {
                user: responseData,
                message: "Registration successful"
            };
        } catch (error) {
            console.error("Registration error:", error);
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError("An unexpected error occurred during registration");
        }
    },
};
