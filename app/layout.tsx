import type { Metadata } from "next";
import "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sweet Flower Events",
  description: "Organizacija vjenčanja i evenata",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bs">
      <body>{children}</body>
    </html>
  );
}
