export interface IDummyAuth {
  username: string;
  password: string;
  expiresInMins: number;
}

export interface IDummyAuthRefreshBody {
    refreshToken: string;
    expiresInMins: number;
}

export interface IDummyAuthResponse {
    accessToken: string;
    refreshToken: string;
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    gender: string;
    image: string;
}

export interface IDummyAuthErrorResponse {
    message: string;
    status?: number;
}

export interface IDummyAuthRefreshResponse {
    accessToken: string;
    refreshToken: string;
}

export interface IDummyAuthMeResponse {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    gender: string;
    image: string;
    [key: string]: unknown;
}
