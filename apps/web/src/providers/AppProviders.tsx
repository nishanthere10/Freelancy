"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { CustomThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";

const envKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isValidKey =
  typeof envKey === "string" &&
  (envKey.startsWith("pk_test_") || envKey.startsWith("pk_live_"));
const publishableKey = isValidKey ? envKey : "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <CustomThemeProvider>
        <QueryProvider>
          {children}
          <ToastProvider />
        </QueryProvider>
      </CustomThemeProvider>
    </ClerkProvider>
  );
}
