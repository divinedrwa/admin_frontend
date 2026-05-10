import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toast } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Society Admin Dashboard",
  description: "Admin dashboard for society management"
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toast />
      </body>
    </html>
  );
}
