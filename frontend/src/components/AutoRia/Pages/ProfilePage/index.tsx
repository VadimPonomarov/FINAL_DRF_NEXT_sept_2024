"use client";

// Placeholder for ProfilePage
// This page should be implemented based on your requirements
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to updated profile page if it exists
    router.push('/autoria/profile-updated');
  }, [router]);

  return null;
}
