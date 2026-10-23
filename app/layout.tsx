import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Вантаж Команда — завдання для бригади",
  description: "Планування робіт, таймер і журнал виконаних завдань для вантажників.",
  icons: {
    icon: "/logo-vantazh-komanda.svg",
    shortcut: "/logo-vantazh-komanda.svg",
    apple: "/logo-vantazh-komanda.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
