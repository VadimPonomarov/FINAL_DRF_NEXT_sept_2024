import * as React from 'react';

/**
 * Next.js dev overlay crashes on React 19 SSR because `useInsertionEffect`
 * executes before the dispatcher gets initialised. On the server we do not
 * need this hook, so we provide a harmless no-op implementation.
 */
if (typeof window === 'undefined') {
  const reactAny = React as unknown as {
    useInsertionEffect?: typeof React.useInsertionEffect;
  };

  reactAny.useInsertionEffect = ((..._args: Parameters<typeof React.useEffect>) => {
    // Server render: do nothing.
    return undefined;
  }) as typeof React.useInsertionEffect;
} else if (!React.useInsertionEffect) {
  // Extremely defensive fallback for environments that miss the hook
  (React as unknown as {
    useInsertionEffect?: typeof React.useInsertionEffect;
  }).useInsertionEffect = (React.useLayoutEffect || React.useEffect) as typeof React.useInsertionEffect;
}
