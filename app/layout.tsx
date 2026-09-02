import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UCCW | Registro de Casos",
  description: "Sistema de registro y seguimiento de casos"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
