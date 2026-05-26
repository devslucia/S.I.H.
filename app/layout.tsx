import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S.I.H. - Sistema Informático Hospitalario",
  description: "Sanatorio SIMES - Posadas, Misiones",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
