"use client";

import React from "react";

export const DocsLoadingView: React.FC = () => (
  <div className="w-full h-[calc(100vh-120px)] mt-[50px] mb-5 flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-foreground">Loading API documentation...</p>
    </div>
  </div>
);
