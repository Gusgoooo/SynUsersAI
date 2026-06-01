import type { Metadata } from 'next'
import './globals.css'
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { AppControls } from "@/components/app-controls";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'SynUsers.AI',
  description: 'Research-backed AI persona and social simulation platform',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className={cn("dark font-sans", inter.variable)} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AppControls />
        {children}
      </body>
    </html>
  )
}
