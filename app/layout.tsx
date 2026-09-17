import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// As duas famílias do Beat: Inter no corpo e nos títulos, JetBrains Mono no
// que é número ou identificador de modelo.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Clara · Suporte Cardios",
  description: "Atendimento de suporte técnico da Cardios por voz. Teste interno.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ee5b00",
  width: "device-width",
  initialScale: 1,
  // O teclado do celular não deve reescalar a tela quando o campo do prompt abre.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
