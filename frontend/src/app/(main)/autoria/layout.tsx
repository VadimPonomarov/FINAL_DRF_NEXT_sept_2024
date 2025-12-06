import AutoRiaLayout from "@/modules/autoria/layout";
import { BackendTokenPresenceGate } from "@/modules/autoria/auth";
import AutoRiaBootstrap from "@/modules/autoria/layout/AutoRiaBootstrap";

/**
 * УНІВЕРСАЛЬНИЙ Layout для всіх сторінок AutoRia
 * ════════════════════════════════════════════════════════════════════════
 * Дворівнева система валідації:
 *
 * РІВЕНЬ 1: Middleware (універсальний гард сесії)
 *   - Перевіряє сесію NextAuth на КОЖНОМУ запиті
 *   - Якщо сесії немає → редирект на /api/auth/signin
 - Якщо сесія є → пропускає запит далі
 *
 * РІВЕНЬ 2: BackendTokenPresenceGate (HOC у Layout)
 *   - Перевіряє backend-токени в Redis для ВСІХ сторінок AutoRia
 *   - Якщо токенів немає → використовує redirectToAuth для коректного редиректу:
 *     * Якщо є сесія NextAuth → редирект на /login для отримання токенів
 *     * Якщо немає сесії NextAuth → редирект на /api/auth/signin
 *   - Якщо токени є → надає доступ до вмісту
 *
 * Цей Layout є контейнером для всіх без винятку елементів інтерфейсу Autoria
 * ════════════════════════════════════════════════════════════════════════
 */
export default function AutoRiaLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BackendTokenPresenceGate>
      <>
        <AutoRiaBootstrap />
        <AutoRiaLayout>
          {children}
        </AutoRiaLayout>
      </>
    </BackendTokenPresenceGate>
  );
}
