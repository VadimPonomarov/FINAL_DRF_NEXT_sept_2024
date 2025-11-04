"use client"
import React from "react"
import { ThemeToggle } from "@/components/All/ThemeToggle/ThemeToggle"

import { ThemeSelector } from "./theme-selector"

export function ThemeControls() {
  return (
    <div
      className="flex items-center gap-2 [&_button]:bg-transparent [&_button]:border-0 [&_button]:transition-colors [&_button]:duration-300 palette-scope"
      style={{ zIndex: 99999, position: 'relative' }}
    >
      <ThemeSelector />
      <ThemeToggle />
    </div>
  )
}