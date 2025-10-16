import { AuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { AUTH_CONFIG } from "@/common/constants/constants";

// Простое логирование без криптографии
console.log('[Auth Config] Simple OAuth Configuration:');
console.log(`  GOOGLE_CLIENT_ID: ${AUTH_CONFIG.GOOGLE_CLIENT_ID ? '[SET]' : '[EMPTY]'}`);
console.log(`  GOOGLE_CLIENT_SECRET: ${AUTH_CONFIG.GOOGLE_CLIENT_SECRET ? '[SET]' : '[EMPTY]'}`);
console.log(`  NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '[NOT_SET]'}`);
console.log(`  Callback URL: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`);

export const authConfig: AuthOptions = {
  // Правильная конфигурация URL для разных сред
  ...(process.env.NEXT_PUBLIC_IS_DOCKER === 'true'
    ? {
        // Docker среда
        trustHost: true,
        useSecureCookies: false,
      }
    : {
        // Локальная среда
        trustHost: true,
      }
  ),

  // Отключаем server actions для предотвращения ошибок
  experimental: {
    enableWebAuthn: false,
  },

  // Отладочная информация для диагностики
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warn]', code);
    },
    debug(code, metadata) {
      console.log('[NextAuth Debug]', code, metadata);
    }
  },

  providers: [
    GoogleProvider({
      clientId: AUTH_CONFIG.GOOGLE_CLIENT_ID,
      clientSecret: AUTH_CONFIG.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      credentials: {
        email: {
          label: "Email",
          type: "email",
          required: true,
        },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        return { id: credentials.email, email: credentials.email };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 24 hours
  },
  // Настройка страниц для NextAuth
  pages: {
    signIn: '/login',  // Используем нашу кастомную страницу логина
    error: '/login',   // При ошибке тоже редиректим на логин
  },
  callbacks: {
    // Redirect callback для управления редиректами после входа
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth redirect] Callback triggered:', { url, baseUrl });

      // Если URL начинается с baseUrl, используем его
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Если URL относительный, добавляем baseUrl
      else if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // По умолчанию редиректим на главную
      return baseUrl;
    },
    async signIn({ user, account, profile }) {
      console.log('[NextAuth signIn] Callback triggered:');
      console.log('  User:', user);
      console.log('  Account:', account);
      console.log('  Profile:', profile);

      try {
        // Если пользователь входит через credentials (наш бэкенд)
        if (account?.provider === 'credentials' && user?.email) {
          console.log('[NextAuth signIn] Credentials login, authenticating with backend...');

          // Аутентификация с бэкендом
          const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              // Здесь можно добавить пароль если нужно
            }),
          });

          if (backendResponse.ok) {
            const authData = await backendResponse.json();
            console.log('[NextAuth signIn] Backend authentication successful');

            // Сохраняем токен в Redis
            try {
              await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/redis`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  key: 'backend_auth',
                  value: JSON.stringify(authData),
                }),
              });
              console.log('[NextAuth signIn] Token saved to Redis');
            } catch (redisError) {
              console.error('[NextAuth signIn] Failed to save token to Redis:', redisError);
            }
          } else {
            console.warn('[NextAuth signIn] Backend authentication failed');
          }
        }

        // Для Google OAuth или других провайдеров можно создать пользователя в бэкенде
        if (account?.provider === 'google' && user?.email) {
          console.log('[NextAuth signIn] Google OAuth, creating/updating user in backend...');
          // Здесь можно добавить логику создания пользователя в бэкенде
        }

        return true;
      } catch (error) {
        console.error('[NextAuth signIn] Error during sign in:', error);
        return true; // Разрешаем вход даже при ошибке бэкенда
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[NextAuth session] Callback triggered:', { session, token });

      if (!session.expires) {
        throw new Error("Session expiration date is undefined.");
      }

      const expiresTimestamp = new Date(session.expires).getTime();

      if (isNaN(expiresTimestamp)) {
        throw new Error("Session expiration date is not a valid timestamp.");
      }

      // Возвращаем кастомную структуру сессии как в оригинале
      return {
        email: session.user?.email || token.email,
        accessToken: token.accessToken,
        expiresOn: new Date(expiresTimestamp).toLocaleString(),
      } as unknown as Session;
    },
  },
};