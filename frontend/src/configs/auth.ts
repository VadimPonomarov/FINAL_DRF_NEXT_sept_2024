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
        console.log('[CredentialsProvider] authorize called with:', { email: credentials?.email });

        if (!credentials?.email) {
          console.log('[CredentialsProvider] No email provided');
          return null;
        }

        // Разрешаем создание NextAuth сессии для любого email
        // Backend токены будут проверяться middleware для доступа к /autoria
        console.log('[CredentialsProvider] Allowing NextAuth session for email:', credentials.email);
        return { id: credentials.email, email: credentials.email };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days (увеличено с 24 часов)
    updateAge: 60 * 60 * 24, // Обновлять сессию каждые 24 часа
  },
  // НЕ указываем pages - пусть NextAuth использует встроенные страницы
  // Встроенная страница входа: /api/auth/signin
  // Встроенная страница выхода: /api/auth/signout
  // Встроенная страница ошибок: /api/auth/error
  callbacks: {
    // JWT callback - добавляем данные в токен
    async jwt({ token, user }) {
      console.log('[NextAuth JWT] Callback triggered:', {
        hasToken: !!token,
        hasUser: !!user,
        email: token.email
      });

      if (user) {
        token.accessToken = user.id;
        token.email = user.email;
      }
      return token;
    },

    // Session callback - формируем сессию из токена
    async session({ session, token }) {
      console.log('[NextAuth Session] Callback triggered:', {
        hasSession: !!session,
        hasToken: !!token,
        email: token.email
      });

      if (!session.expires) {
        console.error('[NextAuth Session] Session expiration date is undefined');
        throw new Error("Session expiration date is undefined.");
      }

      const expiresTimestamp = new Date(session.expires).getTime();

      if (isNaN(expiresTimestamp)) {
        console.error('[NextAuth Session] Session expiration date is not a valid timestamp');
        throw new Error("Session expiration date is not a valid timestamp.");
      }

      // Возвращаем расширенную сессию с дополнительными данными
      return {
        ...session,
        user: {
          ...session.user,
          email: token.email as string,
        },
        accessToken: token.accessToken,
        expiresOn: new Date(expiresTimestamp).toLocaleString(),
      } as Session;
    },

    // Redirect callback для управления редиректами после входа
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth redirect] Callback triggered:', { url, baseUrl });

      // Если это полный URL, начинающийся с baseUrl
      if (url.startsWith(baseUrl)) {
        console.log('[NextAuth redirect] Full URL with baseUrl, using it:', url);
        return url;
      }

      // Если это относительный URL
      if (url.startsWith('/')) {
        console.log('[NextAuth redirect] Relative URL, adding baseUrl:', `${baseUrl}${url}`);
        return `${baseUrl}${url}`;
      }

      // Внешний URL - проверяем безопасность
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);

        // Разрешаем только редиректы на тот же домен
        if (urlObj.hostname === baseUrlObj.hostname) {
          console.log('[NextAuth redirect] External URL on same domain, allowing:', url);
          return url;
        }

        console.log('[NextAuth redirect] External URL on different domain, redirecting to base');
        return baseUrl;
      }

      // По умолчанию редиректим на главную
      console.log('[NextAuth redirect] Default redirect to baseUrl');
      return baseUrl;
    },
    async signIn({ user, account, profile }) {
      console.log('[NextAuth signIn] Callback triggered:');
      console.log('  User:', user);
      console.log('  Account:', account);
      console.log('  Profile:', profile);

      // ВАЖНО: Токены сохраняются в Redis клиентским кодом в useLoginForm.ts
      // Здесь мы просто разрешаем вход для всех провайдеров

      if (account?.provider === 'credentials') {
        console.log('[NextAuth signIn] Credentials login - allowing signin');
        // Токены уже сохранены в Redis клиентским кодом
        return true;
      }

      if (account?.provider === 'google') {
        console.log('[NextAuth signIn] Google OAuth - allowing signin');
        // Для Google OAuth можно добавить логику создания пользователя в бэкенде
        return true;
      }

      // Разрешаем вход для всех других провайдеров
      return true;
    },
  },
};