"use client"

import { Button } from "@/components/ui/button"
import { FileText, Plus, Settings, BarChart3, Users, Zap, CheckCircle, Inbox, Building2 } from "lucide-react"

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  userRole?: "student" | "admin" | "employee" | "reviewer"
  permissions?: string[]
}

export default function Sidebar({ currentView, onViewChange, userRole = "student", permissions = [], className }: SidebarProps & { className?: string }) {
  const hasPermission = (permission: string) => {
    return permissions.includes("all") || permissions.includes(permission)
  }

  const getEmployeeMenu = () => {
    const baseMenu = [
      { id: "requests", label: "طلباتي", icon: FileText },
      { id: "submit", label: "طلب جديد", icon: Plus }
    ]

    // Inbox - show pending requests to review
    if (hasPermission("review_requests")) {
      baseMenu.push({ id: "inbox", label: "صندوق الوارد", icon: Inbox })
    }

    // Forms management
    if (hasPermission("manage_forms")) {
      baseMenu.push({ id: "forms", label: "إدارة النماذج", icon: FileText })
    }

    // Users management
    if (hasPermission("manage_users")) {
      baseMenu.push({ id: "users", label: "إدارة المستخدمين", icon: Users })
    }

    // Departments management
    if (hasPermission("manage_departments")) {
      baseMenu.push({ id: "departments", label: "إدارة الأقسام", icon: Building2 })
    }

    // Reports
    if (hasPermission("view_reports")) {
      baseMenu.push({ id: "reports", label: "التقارير", icon: BarChart3 })
    }

    // Workflows
    if (hasPermission("manage_workflows")) {
      baseMenu.push({ id: "workflows", label: "مسارات العمل", icon: Zap })
    }

    // Show history only if can review
    if (hasPermission("review_requests")) {
      baseMenu.push({ id: "history", label: "سجل الإجراءات", icon: CheckCircle })
    }

    // Always show settings
    baseMenu.push({ id: "settings", label: "الإعدادات", icon: Settings })
    return baseMenu
  }

  const menuConfig = {
    student: [
      { id: "requests", label: "الطلبات", icon: FileText },
      { id: "submit", label: "طلب جديد", icon: Plus },
      { id: "settings", label: "الإعدادات", icon: Settings },
    ],
    admin: [
      { id: "home", label: "لوحة التحكم", icon: BarChart3 },
      { id: "forms", label: "إدارة النماذج", icon: FileText },
      { id: "workflows", label: "مسارات العمل", icon: Zap },
      { id: "departments", label: "إدارة الأقسام", icon: Users },
      { id: "colleges", label: "إدارة الكليات", icon: Building2 },
      { id: "users", label: "إدارة المستخدمين", icon: Users },
      { id: "reports", label: "التقارير", icon: BarChart3 },
    ],
    employee: getEmployeeMenu(),
    reviewer: [
      { id: "requests", label: "صندوق الوارد", icon: Inbox },
      { id: "submit", label: "الطلبات المعالجة", icon: CheckCircle },
      { id: "settings", label: "الإعدادات", icon: Settings },
    ],
  }

  const menuItems = menuConfig[userRole as keyof typeof menuConfig]

  return (
    <aside className={`w-64 bg-card border-l border-slate-200 p-4 space-y-2 overflow-y-auto h-screen ${className || ""}`}>
      {/* Role indicator */}
      <div className="mb-4 p-2 bg-primary/10 rounded-lg">
        <p className="text-xs font-semibold text-primary capitalize">
          {userRole === "student" && "نظام الطالب"}
          {userRole === "admin" && "لوحة التحكم الإدارية"}
          {userRole === "employee" && "نظام الموظف"}
          {userRole === "reviewer" && "نظام المراجع"}
        </p>
      </div>

      {/* Menu items */}
      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = currentView === item.id
        return (
          <Button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            variant={isActive ? "default" : "ghost"}
            className={`w-full justify-start gap-3 ${isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-primary/10"
              }`}
          >
            <Icon className="w-5 h-5" />
            {item.label}
          </Button>
        )
      })}
    </aside>
  )
}
