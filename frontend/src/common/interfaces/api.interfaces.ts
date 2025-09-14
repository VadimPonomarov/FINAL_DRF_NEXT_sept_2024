import { IUser } from "./users.interfaces";

export interface ApiResponse {
    data?: Record<string, unknown>;
    status?: number;
    message?: string;
    error?: string | {
        message: string;
        code?: string;
        [key: string]: unknown;
    };
}

export interface UsersResponse {
    users: IUser[];
    total: number;
    skip: number;
    limit: number;
}

export interface RecipesResponse {
    recipes: Array<Record<string, unknown>>;
    total: number;
}

export interface AuthApiResponse extends ApiResponse {
    data?: {
        access: string;
        refresh: string;
        user?: {
            id: number;
            email: string;
        };
    };
    error?: string | {
        message: string;
        code?: string;
        [key: string]: unknown;
    };
    tokensVerified?: boolean; // Флаг, указывающий, что токены проверены в Redis
}
