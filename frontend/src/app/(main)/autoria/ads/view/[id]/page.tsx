"use client";

import React from "react";
import { ViewAdPageView } from "./ViewAdPageView";

interface ViewAdProps {
  params: Promise<{ id: string }>;
}

export default function ViewAd({ params }: ViewAdProps) {
  return <ViewAdPageView params={params} />;
}
