"use client"

import {
  FileText, Plus, Settings, BarChart3, Users, Zap,
  CheckCircle, Inbox, Building2, Share2, CalendarDays,
  UserCheck, CalendarMinus, ChevronRight
} from "lucide-react"

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  userRole?: "student" | "admin" | "employee" | "reviewer"
  permissions?: string[]
  className?: string
}

export default function Sidebar({
  currentView,
  onViewChange,
  userRole = "student",
  permissions = [],
  className,
}: SidebarProps) {
  const hasPermission = (permission: string) =>
    permissions.includes("all") || permissions.includes(permission)

  const getEmployeeMenu = () => {
    const baseMenu = [
      { id: "requests", label: "طلباتي",      icon: FileText },
      { id: "submit",   label: "طلب جديد",    icon: Plus },
    ]
    if (hasPermission("review_requests"))
      baseMenu.push({ id: "inbox",      label: "صندوق الوارد",    icon: Inbox })
    if (hasPermission("manage_forms"))
      baseMenu.push({ id: "forms",      label: "إدارة النماذج",   icon: FileText })
    if (hasPermission("manage_users"))
      baseMenu.push({ id: "users",      label: "إدارة المستخدمين", icon: Users })
    if (hasPermission("manage_departments"))
      baseMenu.push({ id: "departments",label: "إدارة الأقسام",   icon: Building2 })
    if (hasPermission("view_reports"))
      baseMenu.push({ id: "reports",    label: "التقارير",         icon: BarChart3 })
    if (hasPermission("manage_workflows"))
      baseMenu.push({ id: "workflows",  label: "مسارات العمل",    icon: Zap })
    if (hasPermission("can_manage_absences"))
      baseMenu.push({ id: "absences",   label: "إدارة الغيابات",  icon: CalendarMinus })
    if (hasPermission("manage_terms"))
      baseMenu.push({ id: "terms",      label: "إدارة الأترام",   icon: CalendarDays })
    if (hasPermission("manage_levels"))
      baseMenu.push({ id: "levels",     label: "المستويات والمواد", icon: CalendarMinus })
    if (hasPermission("review_requests")) {
      baseMenu.push({ id: "history",    label: "سجل الإجراءات",   icon: CheckCircle })
      baseMenu.push({ id: "delegation", label: "تفويض الصلاحيات", icon: Share2 })
    }
    baseMenu.push({ id: "settings", label: "الإعدادات", icon: Settings })
    return baseMenu
  }

  const menuConfig = {
    student: [
      { id: "requests",  label: "الطلبات",    icon: FileText },
      { id: "submit",    label: "طلب جديد",   icon: Plus },
      { id: "absences",  label: "الغيابات",   icon: CalendarMinus },
      { id: "settings",  label: "الإعدادات",  icon: Settings },
    ],
    admin: [
      { id: "home",         label: "لوحة التحكم",        icon: BarChart3 },
      { id: "forms",        label: "إدارة النماذج",       icon: FileText },
      { id: "workflows",    label: "مسارات العمل",        icon: Zap },
      { id: "departments",  label: "إدارة الأقسام",       icon: Building2 },
      { id: "colleges",     label: "إدارة الكليات",       icon: Building2 },
      { id: "users",        label: "إدارة المستخدمين",    icon: Users },
      { id: "reports",      label: "التقارير",             icon: BarChart3 },
      { id: "terms",        label: "إدارة الأترام",        icon: CalendarDays },
      { id: "levels",       label: "المستويات والمواد",    icon: CalendarMinus },
      { id: "employee-kpis",label: "أداء الموظفين",        icon: UserCheck },
    ],
    employee: getEmployeeMenu(),
    reviewer: [
      { id: "requests", label: "صندوق الوارد",     icon: Inbox },
      { id: "submit",   label: "الطلبات المعالجة", icon: CheckCircle },
      { id: "settings", label: "الإعدادات",         icon: Settings },
    ],
  }

  const roleLabels: Record<string, string> = {
    student:  "نظام الطالب",
    admin:    "لوحة التحكم الإدارية",
    employee: "نظام الموظف",
    reviewer: "نظام المراجع",
  }

  const menuItems = menuConfig[userRole as keyof typeof menuConfig] ?? []

  return (
    <aside
      dir="rtl"
      className={`
        w-64 h-screen flex flex-col
        bg-white border-l border-[#E2EDEC]
        overflow-hidden
        ${className ?? ""}
      `}
    >
      {/* Role badge */}
      <div className="px-4 pt-5 pb-3">
        <div
          className="
            flex items-center gap-2 px-3 py-2 rounded-xl
            bg-[#E6F7F6] border border-[#B3E8E5]
          "
        >
          <span
            className="
              w-2 h-2 rounded-full bg-[#00A89D] shrink-0
              shadow-[0_0_0_3px_rgba(0,168,157,0.2)]
            "
          />
          <p className="text-xs font-semibold text-[#008A80] truncate">
            {roleLabels[userRole]}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-[#E2EDEC]" />

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                group w-full flex items-center gap-3
                px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 cursor-pointer
                ${isActive
                  ? "bg-[#00A89D] text-white shadow-sm shadow-[#00A89D]/25"
                  : "text-[#2D4847] hover:bg-[#F4F8F8] hover:text-[#00A89D]"
                }
              `}
            >
              {/* Active bar indicator */}
              <span
                className={`
                  shrink-0 w-0.5 h-5 rounded-full
                  transition-all duration-150
                  ${isActive ? "bg-white/50" : "bg-transparent group-hover:bg-[#B3E8E5]"}
                `}
              />

              <Icon
                className={`
                  w-4 h-4 shrink-0 transition-colors duration-150
                  ${isActive ? "text-white" : "text-[#6B8F8E] group-hover:text-[#00A89D]"}
                `}
              />

              <span className="flex-1 text-right">{item.label}</span>

              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-white/70 shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom accent strip */}
      <div className="h-1 bg-gradient-to-r from-[#00A89D] via-[#33BDB5] to-[#F7941D]" />
    </aside>
  )
}
