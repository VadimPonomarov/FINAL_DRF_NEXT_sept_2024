"use client";

import React from "react";
import { Eye } from "lucide-react";
import AdViewPage from "@/components/AutoRia/Pages/AdViewPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdViewEntryPageState } from "./useAdViewEntryPageState";

export const AdViewEntryPageView: React.FC = () => {
  const {
    adId,
    setAdId,
    parsedId,
    canShow,
    showDirectAd,
    handleViewClick,
  } = useAdViewEntryPageState();

  if (showDirectAd) {
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
            <Button disabled={!canShow} onClick={handleViewClick}>
              Переглянути
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            Також можна відкрити сторінку як /autoria/ads/view/&nbsp;
            <em>?id=123</em>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
