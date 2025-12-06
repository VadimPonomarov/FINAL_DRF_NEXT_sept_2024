"use client";

import React from "react";
import { ModerateAdPageView } from "./ModerateAdPageView";

interface ModerateAdProps {
  params: Promise<{ id: string }>;
}

export default function ModerateAd({ params }: ModerateAdProps) {
  return <ModerateAdPageView params={params} />;
}
