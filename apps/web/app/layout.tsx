import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnowStamp - tu pasaporte de esquí y snowboard",
  description:
    "Cada estación que visitas es un sello en tu mapa. Calcula tu porcentaje por país y compáralo con tus amigos. App en desarrollo: apúntate a la lista de espera.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header>SnowStamp</header>
        {children}
      </body>
    </html>
  );
}
