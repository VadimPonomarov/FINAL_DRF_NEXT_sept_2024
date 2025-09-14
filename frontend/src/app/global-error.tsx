'use client'

import { useEffect, useState } from 'react'

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [attemptedReload, setAttemptedReload] = useState(false)

  useEffect(() => {
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /Loading chunk .* failed/i.test(error?.message || '') ||
      /ChunkLoadError/i.test(error?.message || '')

    if (isChunkError && typeof window !== 'undefined') {
      const key = 'chunk-reload-once'
      const already = sessionStorage.getItem(key)
      if (!already) {
        sessionStorage.setItem(key, '1')
        setAttemptedReload(true)
        // Small delay so the UI can render the message before refresh
        setTimeout(() => window.location.reload(), 300)
      }
    }
  }, [error])

  return (
    <html>
      <body style={{ padding: 16, fontFamily: 'sans-serif' }}>
        <h2>Something went wrong</h2>
        {attemptedReload ? (
          <p>Recovering… If this page doesn’t reload automatically, please click the button below.</p>
        ) : (
          <p>
            {error?.name === 'ChunkLoadError' ? 'A network or cache issue prevented the app from loading.' : 'An unexpected error occurred.'}
          </p>
        )}
        <button onClick={() => (typeof window !== 'undefined' ? window.location.reload() : reset())}>
          Reload app
        </button>
      </body>
    </html>
  )
}
