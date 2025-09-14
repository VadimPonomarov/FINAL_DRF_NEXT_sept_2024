import { User } from './user.interface';
import { AuthProvider as AuthProviderEnum } from '../constants/constants';

export interface IAuthContext {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export interface IAuthProviderContext {
  provider: AuthProviderEnum;
  setProvider: (provider: AuthProviderEnum) => Promise<void>;
} 