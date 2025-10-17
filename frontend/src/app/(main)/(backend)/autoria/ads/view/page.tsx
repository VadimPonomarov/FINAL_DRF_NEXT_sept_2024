"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdViewPage from '@/components/AutoRia/Pages/AdViewPage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';

export default function ViewAdEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const [adId, setAdId] = useState<string>(idParam || "");

  const parsedId = Number(adId);
  const canShow = Number.isFinite(parsedId) && parsedId > 0;

  if (idParam && canShow) {
    return <AdViewPage adId={parsedId} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" /> Швидкий перегляд оголошення
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 max-w-md">
            <Input
              placeholder="Введіть ID оголошення"
              value={adId}
              onChange={(e) => setAdId(e.target.value)}
              inputMode="numeric"
            />
            <Button
              disabled={!canShow}
              onClick={() => router.push(`/autoria/ads/view/${parsedId}`)}
            >
              Переглянути
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            Також можна відкрити сторінку як /autoria/ads/view/&nbsp;<em>?id=123</em>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

