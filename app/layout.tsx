import type React from "react"
import { RequestProvider } from "@/contexts/request-context"
import { Toaster } from "@/components/ui/toaster"
import type { Metadata } from "next"
import { Cairo } from "next/font/google"
import "./globals.css"

const cairo = Cairo({ subsets: ["arabic"] })

export const metadata: Metadata = {
  title: "نظام المراسلات - Al-Arab University",
  description: "University Correspondence System",

}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      {/* <CHANGE> Added Cairo font for Arabic support and RTL direction */}
      <body suppressHydrationWarning className={`${cairo.className} font-sans antialiased bg-background text-foreground`}>
        <RequestProvider>
          {children}
          <Toaster />
        </RequestProvider>
      </body>
    </html>
  )
}
