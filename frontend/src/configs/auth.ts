import { AuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { AUTH_CONFIG } from "@/shared/constants/constants";

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
    // GoogleProvider создается только если есть credentials
    ...(AUTH_CONFIG.GOOGLE_CLIENT_ID && AUTH_CONFIG.GOOGLE_CLIENT_SECRET ? [
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
      })
    ] : []),
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
        tokenEmail: token.email,
        userEmail: user?.email
      });

      if (user) {
        token.accessToken = user.id;
        token.email = user.email;
        console.log('[NextAuth JWT] Added email to token:', user.email);
      }

      console.log('[NextAuth JWT] Returning token with email:', token.email);
      return token;
    },

    // Session callback - формируем сессию из токена
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          name: token.name || null,
          email: token.email || null,
          image: token.picture || null,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          accessTokenExpires: token.accessTokenExpires,
          error: token.error,
        } as any; // Используем any для совместимости
        
        // Добавляем токен доступа в сессию
        (session as any).accessToken = (token as any).accessToken;
      }
      return session;
    },

    // Redirect callback для управления редиректами после входа
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth redirect] Callback triggered:', { url, baseUrl });

      // После signin всегда редиректим на /login для получения backend токенов
      // /login проверит наличие backend токенов и либо редиректнет на callbackUrl, либо покажет форму
      if (url.includes('/api/auth/signin') || url.includes('/api/auth/callback')) {
        console.log('[NextAuth redirect] After signin/callback, redirecting to /login');
        return `${baseUrl}/login`;
      }

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

      // По умолчанию редиректим на /login
      console.log('[NextAuth redirect] Default redirect to /login');
      return `${baseUrl}/login`;
    },
    async signIn({ user, account, profile }) {
      console.log('[NextAuth signIn] Callback triggered:');
      console.log('  User:', user);
      console.log('  Account:', account);
      console.log('  Profile:', profile);

      if (account?.provider === 'credentials') {
        console.log('[NextAuth signIn] Credentials login - allowing signin');
        // Токены уже сохранены в Redis клиентским кодом в useLoginForm.ts
        return true;
      }

      if (account?.provider === 'google') {
        console.log('[NextAuth signIn] Google OAuth - allowing signin');
        
        // После Google OAuth пользователь должен получить backend токены
        // Это делается на странице /login, куда пользователь будет редиректен
        // если попытается зайти на /autoria без backend токенов
        
        // Примечание: Мы НЕ получаем backend токены здесь, потому что:
        // 1. Пользователь должен выбрать аккаунт для входа (может быть несколько аккаунтов с одним email)
        // 2. Это делается на странице /login для безопасности и контроля
        
        return true;
      }

      // Разрешаем вход для всех других провайдеров
      return true;
    },
  },
  events: {
    async signOut(message) {
      try {
        const { token, session } = message as any;
        const email = token?.email || session?.user?.email;
        const { redis } = await import('@/lib/redis');

        if (email) {
          const providerKey = `provider:${email}`;
          const tokensKey = `tokens:${email}`;
          const autoRiaTokensKey = `autoria:tokens:${email}`;
          const backendAuthKey = `backend_auth`;
          const dummyAuthKey = `dummy_auth`;
          await Promise.all([
            redis.del(providerKey),
            redis.del(tokensKey),
            redis.del(autoRiaTokensKey),
            redis.del(backendAuthKey),
            redis.del(dummyAuthKey),
          ]);
          console.log('[NextAuth events.signOut] Redis cleared for:', email);
        } else {
          await Promise.all([
            redis.del('backend_auth'),
            redis.del('dummy_auth'),
          ]);
          console.log('[NextAuth events.signOut] Redis cleared (no email)');
        }
      } catch (e) {
        console.error('[NextAuth events.signOut] Error during Redis cleanup:', e);
      }
    },
    async signIn(message) {
      // Превентивно убираем ВСЕ токены (включая backend_auth, dummy_auth) перед новым входом
      try {
        const { user } = message as any;
        const email = user?.email;
        const { redis } = await import('@/lib/redis');
        
        if (email) {
          const providerKey = `provider:${email}`;
          const tokensKey = `tokens:${email}`;
          const autoRiaTokensKey = `autoria:tokens:${email}`;
          await Promise.all([
            redis.del(providerKey),
            redis.del(tokensKey),
            redis.del(autoRiaTokensKey),
            redis.del('backend_auth'),
            redis.del('dummy_auth'),
            redis.del('auth_provider'),
          ]);
          console.log('[NextAuth events.signIn] Full pre-clean Redis for:', email);
        } else {
          await Promise.all([
            redis.del('backend_auth'),
            redis.del('dummy_auth'),
            redis.del('auth_provider'),
          ]);
          console.log('[NextAuth events.signIn] Full pre-clean Redis (no email)');
        }
      } catch (e) {
        console.warn('[NextAuth events.signIn] Pre-clean failed (ignored):', e);
      }
    },
  }
};