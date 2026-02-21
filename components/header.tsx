"use client"

import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"
import { translateRole } from "@/lib/translations"

import Image from "next/image"

interface HeaderProps {
  userType: string
  userName?: string
  userId: string
  onLogout: () => void
  onMenuClick?: () => void
}

export default function Header({ userType, userName, userId, onLogout, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-card border-b border-slate-200 px-6 py-4 flex items-center justify-between" dir="rtl">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" x2="21" y1="6" y2="6" />
              <line x1="3" x2="21" y1="12" y2="12" />
              <line x1="3" x2="21" y1="18" y2="18" />
            </svg>
          </Button>
        )}
        <Image src="/university-logo.png" alt="جامعة العرب" width={40} height={40} className="h-10 w-auto" priority />
        <div>
          <h1 className="text-lg font-bold text-foreground hidden sm:block">نظام المراسلات</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Al-Arab University</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10">
          <User className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {userName ? `${userName} - ` : ""}{translateRole(userType)}
          </span>
        </div>
        
        {/* Notifications removed per user request */}

        <Button variant="ghost" size="icon" onClick={onLogout} className="text-muted-foreground hover:text-destructive">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
