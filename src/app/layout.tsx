import "./globals.css";
import type { Metadata } from "next";
import { Toast } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Society Admin Dashboard",
  description: "Admin dashboard for society management"
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
