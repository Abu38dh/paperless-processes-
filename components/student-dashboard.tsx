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
import { Sheet, SheetContent } from "@/components/ui/sheet"

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
  const [currentView, setCurrentView] = useState<"requests" | "submit" | "settings">("requests")
  const [selectedRequestType, setSelectedRequestType] = useState<string | null>(null)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)

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
  }, [])

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const fetchDashboardData = async () => {
    setLoading(true)
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
          type: r.form_templates?.name || "General",
          formId: r.form_templates?.form_id?.toString() || r.form_id?.toString(),
          date: new Date(r.submitted_at).toISOString().split('T')[0],
          status: r.status === 'returned' ? 'rejected_with_changes' : (r.status || "pending"),
          description: (r.submission_data as any)?.reason || "لا يوجد وصف",
          submissionData: r.submission_data,
          reference_no: r.reference_no,
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
                role: step.users?.full_name || step.roles?.role_name || "موافق",
                status: status
              };
            });
          })()
        }))

        setRequests(mappedRequests)
        setStats(dashboardResult.data.stats)

        if (mappedRequests.length > 0 && !selectedRequest) {
          setSelectedRequest(mappedRequests[0].id)
        }
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
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Header
        userType={`طالب - ${userData.full_name}`}
        onLogout={onLogout}
        onMenuClick={() => setIsMobileMenuOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <Sidebar currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} userRole="student" />
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="right" className="p-0 border-0 w-64">
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

        <main className="flex-1 overflow-auto">
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
                  <div className="p-6 border-b bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>إجمالي الطلبات</CardDescription>
                          <CardTitle className="text-3xl">{stats.total}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>قيد المعالجة</CardDescription>
                          <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>مكتملة</CardDescription>
                          <CardTitle className="text-3xl text-green-600">{stats.completed}</CardTitle>
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
                    <div className="flex h-full">
                      <div className="w-full md:w-1/3 border-l border-border overflow-auto">
                        <RequestList
                          requests={requests}
                          selectedId={selectedRequest}
                          onSelect={setSelectedRequest}
                          loading={loading}
                        />
                      </div>
                      <div className="hidden md:flex md:w-2/3 flex-col overflow-auto">
                        {selectedRequest ? (
                          <RequestDetail
                            request={requests.find((r) => r.id === selectedRequest)!}
                            onEdit={() => setEditingRequestId(selectedRequest)}
                            userId={userData.university_id}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
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
            <div className="p-6 max-w-4xl">
              {!selectedRequestType && !editingRequestId ? (
                <>
                  <h2 className="text-2xl font-bold text-foreground mb-4">طلب جديد</h2>
                  <Card>
                    <CardHeader>
                      <CardTitle>نوع الطلب</CardTitle>
                      <CardDescription>اختر نوع الطلب الذي تريد تقديمه</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requestTypes.map((type) => (
                          <Button
                            key={type.id}
                            onClick={() => setSelectedRequestType(type.id)}
                            variant="outline"
                            className="h-auto py-4 justify-start text-right bg-transparent hover:bg-primary/10 hover:border-primary"
                          >
                            <span className="text-xl me-2">{type.icon}</span>
                            {type.label}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
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
