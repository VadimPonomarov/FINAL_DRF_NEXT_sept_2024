import AutoRiaLayout from "@/components/AutoRia/Layout/AutoRiaLayout";
import BackendTokenPresenceGate from "@/components/AutoRia/Auth/BackendTokenPresenceGate";

/**
 * Серверный layout для AutoRia
 * Использует клиентский AuthGuard для проверки backend токенов
 * 
 * Порядок проверок:
 * 1. Middleware: NextAuth сессия → если нет → /api/auth/signin
 * 2. BackendTokenPresenceGate (клиентский): Проверяет ТОЛЬКО наличие токенов в Redis → если нет → /login
 * 3. API запросы: 401/403 → refresh токенов или редирект
 */
export default function AutoRiaLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BackendTokenPresenceGate>
      <AutoRiaLayout>
        {children}
      </AutoRiaLayout>
    </BackendTokenPresenceGate>
  );
}
