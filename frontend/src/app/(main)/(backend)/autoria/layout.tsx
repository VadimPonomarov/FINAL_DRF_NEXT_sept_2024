import AutoRiaLayout from "@/components/AutoRia/Layout/AutoRiaLayout";
import BackendTokenPresenceGate from "@/components/AutoRia/Auth/BackendTokenPresenceGate";

/**
 * УНИВЕРСАЛЬНЫЙ Layout для всех страниц AutoRia
 * ════════════════════════════════════════════════════════════════════════
 * Двухуровневая система валидации:
 * 
 * УРОВЕНЬ 1: Middleware (универсальный гард сессии)
 *   - Проверяет NextAuth сессию на КАЖДОМ запросе
 *   - Если сессии нет → редирект на /api/auth/signin
 *   - Если сессия есть → пропускает запрос дальше
 * 
 * УРОВЕНЬ 2: BackendTokenPresenceGate (HOC в Layout)
 *   - Проверяет backend токены в Redis для ВСЕХ страниц AutoRia
 *   - Если токенов нет → использует redirectToAuth для правильного редиректа:
 *     * Если есть NextAuth сессия → редирект на /login для получения токенов
 *     * Если нет NextAuth сессии → редирект на /api/auth/signin
 *   - Если токены есть → разрешает доступ к содержимому
 * 
 * Этот Layout является контейнером для всех без исключения элементов интерфейса Autoria
 * ════════════════════════════════════════════════════════════════════════
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
