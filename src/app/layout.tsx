import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { QueryProvider } from "@/lib/providers/query-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Rushify | Premium Media Dashboard",
  description:
    "Rushify is a white-label media streaming dashboard for live TV and personal libraries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
