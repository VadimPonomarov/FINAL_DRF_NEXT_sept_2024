import AutoRiaLayout from "@/components/AutoRia/Layout/AutoRiaLayout";
import { AutoRiaAuthGuard } from "@/components/AutoRia/Auth/AutoRiaAuthGuard";

/**
 * Серверный layout для AutoRia
 * Использует клиентский AuthGuard для проверки backend токенов
 * 
 * Порядок проверок:
 * 1. Middleware: NextAuth сессия → если нет → /api/auth/signin
 * 2. AuthGuard (клиентский): Backend токены → если нет → /login
 * 3. API запросы: 401/403 → refresh токенов или редирект
 */
export default function AutoRiaLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AutoRiaAuthGuard requireBackendAuth={true}>
      <AutoRiaLayout>
        {children}
      </AutoRiaLayout>
    </AutoRiaAuthGuard>
  );
}
