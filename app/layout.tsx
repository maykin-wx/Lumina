import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Lumina", template: "%s · Lumina" },
  description: "Organize provas, vestibulares, concursos e tarefas em um só calendário.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Lumina — seu tempo, com clareza",
    description: "Organize provas, vestibulares, concursos e tarefas em um só calendário.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Lumina — seu tempo, com clareza" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
