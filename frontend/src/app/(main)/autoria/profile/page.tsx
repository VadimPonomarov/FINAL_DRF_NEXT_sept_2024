import { Metadata } from "next";
import { Suspense } from 'react';
import UpdatedProfilePage from '@/components/AutoRia/Pages/UpdatedProfilePage';

export const metadata: Metadata = {
  title: "Profile - CarHub",
  description: "Profile settings and account management",
};

export default function Profile() {
  return (
    <Suspense fallback={<div>Loading profile...</div>}>
      <UpdatedProfilePage />
    </Suspense>
  );
}
