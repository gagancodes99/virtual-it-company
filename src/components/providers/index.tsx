"use client";

import { AuthProvider } from "./AuthProvider";
import { TRPCProvider } from "./TRPCProvider";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <TRPCProvider>
          {children}
        </TRPCProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}