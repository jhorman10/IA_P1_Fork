import "@/styles/globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import Navbar from "@/components/Navbar/Navbar";
import { AuthProvider } from "@/context/AuthProvider";
import { DependencyProvider } from "@/context/DependencyContext";
import { ThemeProvider } from "@/context/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Turnos Pantalla",
  description: "Sistema de Turnos IA_P1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.location.pathname==='/'){document.documentElement.setAttribute('data-theme','light');return;}var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}else{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',d?'dark':'light');}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <DependencyProvider>
              <Navbar />
              {children}
            </DependencyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
