/**
 * Layout для search страницы.
 * AutoRiaLayout и BackendTokenPresenceGate уже предоставлены
 * родительским autoria/layout.tsx.
 * BackendTokenPresenceGate пропускает /autoria/search без проверки токенов.
 */
export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
