"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import RequestList from "@/components/request-list"
import RequestDetail from "@/components/request-detail"
import RequestSubmissionForm from "@/components/student/request-submission-form"
import { DashboardSkeleton } from "@/components/ui/loading-skeleton"
import { ErrorMessage } from "@/components/ui/error-message"
import { EmptyState } from "@/components/ui/empty-state"
import { getStudentDashboardData } from "@/app/actions/student"
import { getAvailableFormTemplates } from "@/app/actions/forms"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Search, Sparkles, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"

interface StudentDashboardProps {
  onLogout: () => void
  userData: {
    university_id: string
    full_name: string
    role: string
  }
}

export default function StudentDashboard({ onLogout, userData }: StudentDashboardProps) {
  const [selectedRequest, setSelectedRequest] = useState<string>("")
  type ViewType = "requests" | "submit" | "settings"
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem('studentDashboardView')
      if (saved) return saved as ViewType
    }
    return "requests"
  })

  useEffect(() => {
    window.sessionStorage.setItem('studentDashboardView', currentView)
  }, [currentView])
  const [selectedRequestType, setSelectedRequestType] = useState<string | null>(null)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [formSearchQuery, setFormSearchQuery] = useState("")

  // State for requests and stats
  // State for requests and stats
  const [requests, setRequests] = useState<any[]>([])
  const [availableForms, setAvailableForms] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData()

    // --- REAL-TIME UPDATES (SSE) ---
    const eventSource = new EventSource('/api/realtime')
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'refresh') {
          console.log(`[Realtime] Received ${data.target} refresh signal. Updating dashboard...`)
          fetchDashboardData()
        }
      } catch (err) {}
    }
    eventSource.onerror = () => {
      console.warn("[Realtime] Student EventSource lost connection. Retrying...")
    }

    return () => eventSource.close()
  }, [])

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const fetchDashboardData = async () => {
    setError(null)

    try {
      // Parallel fetch for dashboard data and available forms
      const [dashboardResult, formsResult] = await Promise.all([
        getStudentDashboardData(userData.university_id),
        getAvailableFormTemplates(userData.university_id)
      ])

      if (dashboardResult.success && dashboardResult.data) {
        // Map DB requests to UI format
        const mappedRequests = dashboardResult.data.requests.map((r: any) => ({
          id: r.request_id.toString(),
          title: r.form_templates?.name || "طلب عام",
          type: r.form_templates?.name || "طلب عام",
          formId: r.form_templates?.form_id?.toString() || r.form_id?.toString() || "",
          date: new Date(r.submitted_at).toISOString().split('T')[0],
          status: r.status === 'returned' ? 'rejected_with_changes' : (r.status || "pending"),
          description: (r.submission_data as any)?.reason || "لا يوجد وصف",
          submissionData: r.submission_data,
          formSchema: r.form_templates?.schema || null,
          reference_no: r.reference_no,
          pdfTemplate: r.form_templates?.pdf_template,
          applicant: userData.full_name,
          users: r.users, // Pass the users object containing college/dept info
          workflow: (() => {
            const steps = r.form_templates?.request_types?.workflows?.workflow_steps || [];
            const currentStepId = r.current_step_id;
            const requestStatus = r.status;

            // Find current step index
            const currentStepIndex = steps.findIndex((s: any) => s.step_id === currentStepId);

            return steps.map((step: any, index: number) => {
              let status = "pending";

              if (requestStatus === "approved") {
                status = "approved";
              } else if (requestStatus === "rejected") {
                if (index < currentStepIndex) status = "approved";
                else if (index === currentStepIndex) status = "rejected";
                else status = "pending";
              } else if (requestStatus === "returned" || requestStatus === "rejected_with_changes") {
                if (index < currentStepIndex) status = "approved";
                else if (index === currentStepIndex) status = "returned";
                else status = "pending";
              } else {
                // In progress
                if (index < currentStepIndex) status = "approved";
                else if (index === currentStepIndex) status = "processing";
                else status = "pending";

                // Fallback if currentStepIndex is -1 (shouldn't happen for valid active requests) but maybe it's new
                if (currentStepIndex === -1 && index === 0 && requestStatus !== 'approved' && requestStatus !== 'rejected') {
                  status = "processing";
                }
              }

              return {
                step: index + 1,
                department: step.name || `خطوة ${index + 1}`,
                role: step.users?.full_name || step.roles?.role_name || "المسؤول",
                status: status
              };
            });
          })()
        }))

        setRequests(mappedRequests)
        setStats(dashboardResult.data.stats)

        // Only auto-select first request if we are on a larger screen (can't easily detect here without window, so let's default to no selection to be mobile-safe, or check client width)
        // Ideally we want desktop users to see something.
        // Let's rely on the user clicking for now, or use a media query hook if available, but for now simple is better.
        // If we want to keep desktop behavior, we could potentially set it, but then mobile users get thrown into detail view.
        // Compromise: Don't auto-select. This is safer for mobile.
        // if (mappedRequests.length > 0 && !selectedRequest) {
        //   setSelectedRequest(mappedRequests[0].id)
        // }
      } else {
        setError(dashboardResult.error || "فشل في تحميل البيانات")
      }

      // Handle forms
      if (formsResult.success && formsResult.data) {
        setAvailableForms(formsResult.data.map(form => ({
          id: form.form_id.toString(),
          label: form.name,
          icon: "📝" // Default icon
        })))
      }

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err)
      setError("حدث خطأ في الاتصال بقاعدة البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handleNewRequest = async () => {
    // Refresh data after submission
    await fetchDashboardData()
    setCurrentView("requests")
    setSelectedRequestType(null)
    setEditingRequestId(null)
  }

  // requestTypes derived from availableForms
  const requestTypes = availableForms

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden" dir="rtl">
      <Header
        userType="student"
        userName={userData.full_name}
        onLogout={onLogout}
        onMenuClick={() => setIsMobileMenuOpen(true)}
        userId={userData.university_id}
      />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <Sidebar currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} userRole="student" />
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="right" className="p-0 border-0 w-64">
            <div className="sr-only">
              <SheetTitle>قائمة التنقل</SheetTitle>
              <SheetDescription>قائمة التنقل الجانبية للوصول للخدمات</SheetDescription>
            </div>
            <Sidebar
              currentView={currentView}
              onViewChange={(view) => {
                setCurrentView(view as any)
                setIsMobileMenuOpen(false)
              }}
              userRole="student"
              className="h-full border-none w-full"
            />
          </SheetContent>
        </Sheet>

        <main className="flex-1">
          {/* Requests View */}
          {currentView === "requests" && !editingRequestId && (
            <>
              {loading ? (
                <div className="p-6">
                  <DashboardSkeleton />
                </div>
              ) : error ? (
                <div className="p-6">
                  <ErrorMessage error={error} onRetry={fetchDashboardData} />
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  {/* Stats Cards */}
                  <div className="p-3 md:p-6 border-b bg-muted/30 w-full overflow-hidden">
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                      <Card className="md:min-w-0 shadow-sm border-slate-200">
                        <CardHeader className="p-2 md:pb-2 text-center md:text-right">
                          <CardDescription className="text-[10px] md:text-sm whitespace-nowrap overflow-hidden text-ellipsis">الكل</CardDescription>
                            <CardTitle className="text-lg md:text-3xl">{stats.total}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card className="md:min-w-0 shadow-sm border-slate-200">
                        <CardHeader className="p-2 md:pb-2 text-center md:text-right">
                          <CardDescription className="text-[10px] md:text-sm whitespace-nowrap overflow-hidden text-ellipsis">قيد المعالجة</CardDescription>
                          <CardTitle className="text-lg md:text-3xl text-yellow-600">{stats.pending}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card className="md:min-w-0 shadow-sm border-slate-200">
                        <CardHeader className="p-2 md:pb-2 text-center md:text-right">
                          <CardDescription className="text-[10px] md:text-sm whitespace-nowrap overflow-hidden text-ellipsis">مكتملة</CardDescription>
                          <CardTitle className="text-lg md:text-3xl text-green-600">{stats.completed}</CardTitle>
                        </CardHeader>
                      </Card>
                    </div>
                  </div>

                  {/* Requests List & Detail */}
                  {requests.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        icon="📭"
                        title="لا توجد طلبات"
                        description={`مرحباً ${userData.full_name}! لم تقم بتقديم أي طلبات بعد. ابدأ بتقديم طلب جديد.`}
                        action={{
                          label: "تقديم طلب جديد",
                          onClick: () => setCurrentView("submit")
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      {/* Request List Column */}
                      <div className={`w-full md:w-1/3 space-y-4 ${selectedRequest ? 'hidden md:block' : 'block'
                        }`}>
                        <RequestList
                          requests={requests}
                          selectedId={selectedRequest}
                          onSelect={setSelectedRequest}
                          loading={loading}
                        />
                      </div>

                      {/* Request Detail Column */}
                      <div className={`w-full md:w-2/3 flex flex-col bg-slate-50/50 p-4 md:p-6 rounded-lg border border-border/50 ${selectedRequest ? 'flex' : 'hidden md:flex'
                        }`}>
                        {selectedRequest ? (
                          <RequestDetail
                            request={requests.find((r) => r.id === selectedRequest)!}
                            onEdit={() => setEditingRequestId(selectedRequest)}
                            onBack={() => setSelectedRequest("")}
                            userId={userData.university_id}
                            showHistory={false}
                          />
                        ) : (
                          <div className="flex items-center justify-center p-12 text-muted-foreground w-full">
                            اختر طلباً لعرض التفاصيل
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Submit View */}
          {currentView === "submit" || editingRequestId ? (
            <div className="p-6 w-full">
              {!selectedRequestType && !editingRequestId ? (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 inline-flex items-center gap-2">
                        <Sparkles className="w-8 h-8 text-primary" />
                        طلب جديد
                      </h2>
                      <p className="text-muted-foreground mt-1">اختر نوع الطلب الذي تريد تقديمه من القائمة أدناه</p>
                    </div>
                    <div className="relative w-full md:w-72">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="ابحث عن نموذج..."
                        value={formSearchQuery}
                        onChange={(e) => setFormSearchQuery(e.target.value)}
                        className="pr-9 bg-background/50 border-primary/20 focus:border-primary transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {requestTypes.filter(f => f.label.toLowerCase().includes(formSearchQuery.toLowerCase())).length > 0 ? (
                      requestTypes
                        .filter(f => f.label.toLowerCase().includes(formSearchQuery.toLowerCase()))
                        .map((type) => (
                          <div
                            key={type.id}
                            onClick={() => setSelectedRequestType(type.id)}
                            className="group relative overflow-hidden bg-card hover:bg-gradient-to-br hover:from-primary/5 hover:to-transparent border border-border/50 hover:border-primary/50 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                          >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                            
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
                                {type.label}
                              </h3>
                              <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors duration-300 rtl:rotate-180" />
                            </div>
                            
                            <div className="flex items-center text-xs font-medium text-primary/70 group-hover:text-primary transition-colors mt-auto">
                              <span>تقديم الطلب</span>
                              <ChevronRight className="w-3 h-3 mr-1 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-slate-50/50">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-semibold mb-1">لم يتم العثور على نتائج</h3>
                        <p className="text-sm opacity-70">جرب البحث بكلمات مختلفة أو تصفح القائمة</p>
                        <Button 
                          variant="link" 
                          onClick={() => setFormSearchQuery("")}
                          className="mt-2 text-primary"
                        >
                          عرض جميع النماذج
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <RequestSubmissionForm
                  requestType={selectedRequestType || requests.find(r => r.id === editingRequestId)?.formId || ""}
                  requestTypes={requestTypes}
                  userId={userData.university_id}
                  onBack={() => {
                    setSelectedRequestType(null)
                    setEditingRequestId(null)
                    if (editingRequestId) setCurrentView("requests")
                  }}
                  onSubmit={handleNewRequest}
                  initialData={editingRequestId ? requests.find(r => r.id === editingRequestId)?.submissionData : undefined}
                  requestId={editingRequestId || undefined}
                  isEditing={!!editingRequestId}
                />
              )}
            </div>
          ) : null}

          {/* Settings View */}
          {currentView === "settings" && (
            <div className="p-6 max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-4">الإعدادات</h2>
              <Card>
                <CardHeader>
                  <CardTitle>معلومات الحساب</CardTitle>
                  <CardDescription>بيانات حسابك الشخصية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم</p>
                    <p className="font-medium">{userData.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الرقم الجامعي</p>
                    <p className="font-medium">{userData.university_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الدور</p>
                    <Badge>طالب</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
