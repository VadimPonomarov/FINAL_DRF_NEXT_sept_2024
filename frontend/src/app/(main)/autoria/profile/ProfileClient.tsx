'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Directly import the ProfilePage component
import ProfilePage from '@/components/AutoRia/Pages/ProfilePage';

export default function ProfileClient() {
  return (
    <Suspense fallback={<div>Loading profile...</div>}>
      <ProfilePage />
    </Suspense>
  );
}
