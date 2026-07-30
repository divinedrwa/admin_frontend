import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visitor pass",
  description: "A secure visitor pass for entry at the society gate.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function VisitorPassLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
