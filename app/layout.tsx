import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/layout/AuthProvider";
import ThemeProvider from "@/components/layout/ThemeProvider";

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
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
