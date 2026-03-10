import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from 'next-auth/jwt';

// Публичные пути - всегда доступны без авторизации
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/',
];

// Защищённые пути - требуют NextAuth сессии
const PROTECTED_PREFIXES = [
  '/autoria',
  '/profile',
  '/settings',
  '/docs',
  '/flower',
  '/rabbitmq',
  '/users',
  '/recipes',
];

// Middleware: проверяет ТОЛЬКО наличие NextAuth сессии.
// Токены (access/refresh) принадлежат внешним API и здесь НЕ проверяются.
export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Пропускаем статические файлы и ресурсы
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    /\.(png|jpg|jpeg|svg|ico|css|js|webp|woff|woff2|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Пропускаем все API маршруты без проверки (защита на уровне handlers)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Пропускаем публичные страницы
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Определяем, нужна ли защита для данного пути
  const isHomePage = pathname === '/';
  const isProtected = isHomePage || PROTECTED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/')
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Проверяем NextAuth сессию.
  // ВАЖНО: используем process.env.NEXTAUTH_SECRET напрямую — AUTH_CONFIG
  // использует Node.js crypto и несовместим с Edge runtime.
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) {
      return NextResponse.next();
    }

    // Сессии нет — редиректим на страницу входа NextAuth
    // callbackUrl = только pathname+search (без origin), чтобы избежать вложенных callbackUrl
    const callbackPath = pathname + req.nextUrl.search;
    const signinUrl = new URL('/api/auth/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', callbackPath);
    return NextResponse.redirect(signinUrl);

  } catch {
    // При ошибке getToken — пропускаем запрос (fail-open).
    // Редирект здесь создал бы бесконечный цикл при транзиентных ошибках Edge.
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
