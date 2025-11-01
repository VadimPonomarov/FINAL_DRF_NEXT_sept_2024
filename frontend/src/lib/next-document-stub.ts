// Minimal safe stub for `next/document` in App Router projects
// Provides components to satisfy indirect imports without using real Document API
import React from 'react';

export const Html: React.FC<React.HTMLAttributes<HTMLHtmlElement>> = ({ children, ...props }) => (
  <html {...props}>{children}</html>
);

export const Head: React.FC<React.HTMLAttributes<HTMLHeadElement>> = ({ children, ...props }) => (
  <head {...props}>{children}</head>
);

export const Main: React.FC<React.HTMLAttributes<HTMLElement>> = ({ children, ...props }) => (
  <main {...props}>{children}</main>
);

export const NextScript: React.FC = () => null;

// Fallback default export to avoid runtime errors if `default` is imported
export default {} as any;
