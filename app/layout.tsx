import type { Metadata } from "next";
import "./globals.css";
import "./demo.css";
import "./premium-v3.css";
import "./ceremony.css";

export const metadata: Metadata = {
  title: "Vanshawali 360 — Royal Premium",
  description: "Private genealogy and multi-vanshawali management prototype.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ne">
      <body className="antialiased">{children}</body>
    </html>
  );
}
