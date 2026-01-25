"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import AdminFormsPage from "@/components/admin/admin-forms-page"
import WorkflowsEditor from "@/components/admin/workflows-editor"
import AdminUsersPage from "@/components/admin/admin-users-page"
import AdminReportsPage from "@/components/admin/admin-reports-page"
import AdminDepartmentsPage from "@/components/admin/admin-departments-page"
import AdminCollegesPage from "@/components/admin/admin-colleges-page"
import { DashboardSkeleton } from "@/components/ui/loading-skeleton"
import { ErrorMessage } from "@/components/ui/error-message"
import { getAdminStats } from "@/app/actions/admin"
import { FileText, Users, Workflow, BarChart3, Building2, GraduationCap } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"

interface AdminDashboardProps {
  onLogout: () => void
  userData?: {
    university_id: string
    full_name: string
    role: string
  }
}

const adminCards = [
  {
    id: "forms",
    title: "إدارة النماذج",
    description: "إنشاء وتعديل نماذج الطلبات",
    icon: FileText,
  },
  {
    id: "workflows",
    title: "مسارات العمل",
    description: "إدارة مسارات اعتماد الطلبات",
    icon: Workflow,
  },
  {
    id: "users",
    title: "إدارة المستخدمين",
    description: "إضافة وتعديل المستخدمين والصلاحيات",
    icon: Users,
  },
  {
    id: "reports",
    title: "التقارير والتدقيق",
    description: "عرض التقارير وسجل التدقيق",
    icon: BarChart3,
  },
  {
    id: "departments",
    title: "إدارة الأقسام",
    description: "إضافة وتعديل الأقسام الأكاديمية",
    icon: Building2,
  },
  {
    id: "colleges",
    title: "إدارة الكليات",
    description: "إضافة وتعديل الكليات",
    icon: GraduationCap,
  },
]

export default function AdminDashboard({ onLogout, userData }: AdminDashboardProps) {
  const [currentView, setCurrentView] = useState<string>("home")

  // Stats state
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeRequests: 0,
    totalUsers: 0,
    totalForms: 0,
    completionRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const fetchStats = async () => {
    setError(null)

    try {
      const result = await getAdminStats()
      setStats(result)
    } catch (err) {
      console.error("Failed to fetch admin stats:", err)
      setError("حدث خطأ في تحميل الإحصائيات")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Header
        userType={`مدير النظام${userData ? ` - ${userData.full_name}` : ""}`}
        onLogout={onLogout}
        onMenuClick={() => setIsMobileMenuOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <Sidebar currentView={currentView} onViewChange={setCurrentView} userRole="admin" />
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="right" className="p-0 border-0 w-64">
            <Sidebar
              currentView={currentView}
              onViewChange={(view) => {
                setCurrentView(view)
                setIsMobileMenuOpen(false)
              }}
              userRole="admin"
              className="h-full border-none w-full"
            />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-auto">
          {currentView === "home" && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-foreground">لوحة التحكم</h2>
                <p className="text-muted-foreground">إدارة شاملة لنظام المراسلات الجامعية</p>
              </div>

              {loading ? (
                <DashboardSkeleton />
              ) : error ? (
                <ErrorMessage error={error} onRetry={fetchStats} />
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>إجمالي الطلبات</CardDescription>
                        <CardTitle className="text-3xl">{stats.totalRequests}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">جميع الطلبات في النظام</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>الطلبات النشطة</CardDescription>
                        <CardTitle className="text-3xl text-yellow-600">{stats.activeRequests}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">قيد المعالجة حالياً</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>المستخدمون</CardDescription>
                        <CardTitle className="text-3xl text-primary">{stats.totalUsers}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>معدل الإنجاز</CardDescription>
                        <CardTitle className="text-3xl text-green-600">{stats.completionRate}%</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">الطلبات المكتملة</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Management Cards */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4">إدارة النظام</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {adminCards.map((card) => {
                        const Icon = card.icon
                        return (
                          <Card
                            key={card.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
                            onClick={() => setCurrentView(card.id)}
                          >
                            <CardHeader>
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <Icon className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{card.title}</CardTitle>
                                  <CardDescription className="text-sm mt-1">
                                    {card.description}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {currentView === "forms" && <AdminFormsPage onBack={() => setCurrentView("home")} />}
          {currentView === "workflows" && <WorkflowsEditor onBack={() => setCurrentView("home")} />}
          {currentView === "users" && <AdminUsersPage onBack={() => setCurrentView("home")} />}
          {currentView === "reports" && <AdminReportsPage onBack={() => setCurrentView("home")} />}
          {currentView === "departments" && <AdminDepartmentsPage onBack={() => setCurrentView("home")} />}
          {currentView === "colleges" && <AdminCollegesPage onBack={() => setCurrentView("home")} />}
        </main>
      </div>
    </div>
  )
}
