"use client";

// This is a placeholder page for moderation
// Redirect to the main moderation dashboard or ad moderation
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ModerationPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to search page which has moderation features
    router.push('/autoria/search');
  }, [router]);

  return null;
}
