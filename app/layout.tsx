import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "./components/language-provider";
import SessionTimeout from "./components/session-timeout";

export const metadata: Metadata = {
  title: "UCCW | Case Management System",
  description: "Case management and service tracking system"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><LanguageProvider><SessionTimeout />{children}</LanguageProvider></body></html>;
}

