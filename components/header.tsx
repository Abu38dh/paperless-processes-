"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Bell, User } from "lucide-react"

interface HeaderProps {
  userType: string
  onLogout: () => void
}

export default function Header({ userType, onLogout, onMenuClick }: HeaderProps & { onMenuClick?: () => void }) {
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
        <img src="/university-logo.png" alt="جامعة العرب" className="h-10" />
        <div>
          <h1 className="text-lg font-bold text-foreground hidden sm:block">نظام المراسلات</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Al-Arab University</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10">
          <User className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">{userType}</span>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onLogout} className="text-muted-foreground hover:text-destructive">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
