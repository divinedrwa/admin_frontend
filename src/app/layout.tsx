import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toast } from "@/components/Toast";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ThemeFlashPrevention } from "@/theme/flash-prevention";
import { lightTheme } from "@/theme/tokens";

export const metadata: Metadata = {
  title: "GatePass+ Admin",
  description: "GatePass+ admin dashboard for housing societies",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/favicon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: lightTheme.superLogin.to,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeFlashPrevention />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toast />
        </ThemeProvider>
      </body>
    </html>
  );
}
