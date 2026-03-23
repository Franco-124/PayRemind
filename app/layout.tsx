import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/app/components/ui/toast-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PayRemind",
  description: "Gestiona facturas y envía recordatorios automáticos de cobro.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.className}>
      <body className="min-h-screen bg-gray-50">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
