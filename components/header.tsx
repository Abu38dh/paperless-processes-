"use client"

import { LogOut, User, Menu } from "lucide-react"
import { translateRole } from "@/lib/translations"
import Image from "next/image"

interface HeaderProps {
  userType: string
  userName?: string
  userId: string
  onLogout: () => void
  onMenuClick?: () => void
}

export default function Header({
  userType,
  userName,
  userId,
  onLogout,
  onMenuClick,
}: HeaderProps) {
  return (
    <header
      dir="rtl"
      className="
        h-20 px-5 flex items-center justify-between
        bg-white border-b border-[#E2EDEC]
        shadow-[0_1px_3px_rgba(0,168,157,0.08)]
        sticky top-0 z-30
      "
    >
      {/* Right: Logo + Title */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="
              md:hidden flex items-center justify-center
              w-9 h-9 rounded-lg
              text-[#6B8F8E] hover:bg-[#E6F7F6] hover:text-[#00A89D]
              transition-colors duration-150
            "
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Image
          src="/university-logo.png"
          alt="جامعة العرب"
          width={64}
          height={64}
          className="h-14 w-auto object-contain"
          priority
        />

        <div className="hidden sm:block">
          <p className="text-base font-bold text-[#1C2E2D] leading-tight">مسار</p>
          <p className="text-[11px] text-[#6B8F8E] leading-tight">Al-Arab University</p>
        </div>
      </div>

      {/* Left: User info + Logout */}
      <div className="flex items-center gap-2">
        {/* User chip */}
        <div
          className="
            hidden sm:flex items-center gap-2
            px-3 py-1.5 rounded-xl
            bg-[#F4F8F8] border border-[#E2EDEC]
          "
        >
          <div
            className="
              w-7 h-7 rounded-lg flex items-center justify-center
              bg-[#00A89D] text-white shrink-0
            "
          >
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-right leading-tight">
            {userName && (
              <p className="text-xs font-semibold text-[#1C2E2D] max-w-[140px] truncate">
                {userName}
              </p>
            )}
            <p className="text-[11px] text-[#6B8F8E]">{translateRole(userType)}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="
            flex items-center justify-center
            w-9 h-9 rounded-lg
            text-[#6B8F8E] hover:bg-red-50 hover:text-red-500
            border border-transparent hover:border-red-100
            transition-all duration-150
          "
          title="تسجيل الخروج"
          aria-label="تسجيل الخروج"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
