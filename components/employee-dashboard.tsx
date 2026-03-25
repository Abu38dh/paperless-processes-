"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import NextImage from "next/image" // Aliased to avoid conflict with window.Image
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Header from "@/components/header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Sidebar from "@/components/sidebar"
import RequestTracking from "@/components/student/request-tracking"
import RequestSubmissionForm from "@/components/student/request-submission-form"
import RequestList from "@/components/request-list"
import RequestDetail from "@/components/request-detail"
import { DashboardSkeleton, TableSkeleton, ListSkeleton } from "@/components/ui/loading-skeleton"
import { ErrorMessage } from "@/components/ui/error-message"
import { EmptyState } from "@/components/ui/empty-state"
import { getEmployeeInbox, getEmployeeStats, processRequest, getEmployeeRequests } from "@/app/actions/employee"
import { getAvailableFormTemplates } from "@/app/actions/forms"
import { CheckCircle, CheckCircle2, XCircle, Clock, FileText, RotateCcw, Redo2, Upload, ExternalLink, Search, Sparkles, ChevronRight } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import AdminFormsPage from "@/components/admin/admin-forms-page"
import WorkflowsEditor from "@/components/admin/workflows-editor"
import AdminUsersPage from "@/components/admin/admin-users-page"
import AdminReportsPage from "@/components/admin/admin-reports-page"
import AdminDepartmentsPage from "@/components/admin/admin-departments-page"

import { RequestStats } from "@/components/dashboard/request-stats"
import DelegationRequest from "@/components/dashboard/delegation-request"
import { InboxRequestList } from "@/components/dashboard/inbox-request-list"
import { FilePreviewDialog } from "@/components/shared/file-preview-dialog"
import { RequestActionDialog, ActionType } from "@/components/dashboard/request-action-dialog"

import { Request, RequestStats as RequestStatsType } from "@/types/schema"

interface EmployeeDashboardProps {
  onLogout: () => void
  permissions?: string[]
  userData: {
    university_id: string
    full_name: string
    role: string
  }
}

export default function EmployeeDashboard({ onLogout, permissions = [], userData }: EmployeeDashboardProps) {
  type ViewType = "requests" | "inbox" | "submit" | "reviews" | "forms" | "users" | "departments" | "reports" | "workflows" | "delegation" | "settings" | "history"
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem('employeeDashboardView')
      if (saved) return saved as ViewType
    }
    return "requests"
  })

  useEffect(() => {
    window.sessionStorage.setItem('employeeDashboardView', currentView)
  }, [currentView])

  const [selectedRequestType, setSelectedRequestType] = useState<string | null>(null)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [formSearchQuery, setFormSearchQuery] = useState("")

  // Permission helper
  const hasPermission = (permission: string) => {
    return permissions.includes("all") || permissions.includes(permission)
  }

  // Data states
  const [inboxRequests, setInboxRequests] = useState<Request[]>([])
  const [myRequests, setMyRequests] = useState<Request[]>([])
  const [historyRequests, setHistoryRequests] = useState<any[]>([])
  const [availableForms, setAvailableForms] = useState<any[]>([])
  const [stats, setStats] = useState<RequestStatsType>({ returned: 0, approved: 0, rejected: 0, pending: 0 })
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [isProcessing, setIsProcessing] = useState(false)
  // actionComment state removed as it is now handled in RequestActionDialog
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: ActionType }>({
    open: false,
    type: null
  })
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null)
  const [internalNote, setInternalNote] = useState("")
  const [filePreview, setFilePreview] = useState<{ open: boolean; type: 'image' | 'pdf' | 'other'; content: string; name: string } | null>(null)

  // History detail states
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySearchQuery, setHistorySearchQuery] = useState("")


  useEffect(() => {
    // Initial fetch
    fetchInboxData()
    fetchMyRequests()
    fetchStats()
    fetchAvailableForms()
    fetchHistoryData()

    // Auto-refresh interval (polling) for real-time updates
    // --- REAL-TIME UPDATES (SSE) ---
    const eventSource = new EventSource('/api/realtime')
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'refresh') {
          console.log(`[Realtime] Received employee refresh signal (target: ${data.target}). Updating dashboard...`)
          fetchInboxData()
          fetchStats()
        }
      } catch (err) {}
    }
    eventSource.onerror = (error) => {
      console.warn("[Realtime] Employee EventSource connection error, retrying...", error)
    }

    return () => eventSource.close() // Cleanup on unmount
  }, [])
// ... (rest of the component logic)

// ... (render part)

              {/* History Item Detail Sheet */}
              <Sheet open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
                <SheetContent side="left" className="sm:max-w-2xl w-full overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>تفاصيل الطلب (من السجل)</SheetTitle>
                  </SheetHeader>
                  {historyLoading ? (
                    <div className="p-4 space-y-4">
                      <div className="h-4 bg-muted animate-pulse rounded w-1/4"></div>
                      <div className="h-32 bg-muted animate-pulse rounded"></div>
                    </div>
                  ) : selectedHistoryItem && selectedHistoryItem !== true ? (
                    <div className="mt-6">
                      <RequestDetail
                        request={selectedHistoryItem}
                        showHistory={true}
                      />
                    </div>
                  ) : null}
                </SheetContent>
              </Sheet>

  const fetchMyRequests = async () => {
    try {
      const result = await getEmployeeRequests(userData.university_id)
      if (result.success && result.requests) {
        // Map the response to match Request interface
        const mappedRequests: Request[] = result.requests.map((r: any) => ({
          ...r,
          applicant: r.users?.full_name || "N/A", // Ensure applicant exists
          status: r.status as any, // Cast status
          type: r.title || r.type // Handle title/type discrepancy
        }))
        setMyRequests(mappedRequests)
      }
    } catch (err) {
      console.error("Failed to fetch my requests:", err)
    }
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const fetchInboxData = async () => {
    setError(null)

    try {
      const result = await getEmployeeInbox(userData.university_id)

      if (result.success && result.requests) {
        const mappedRequests: Request[] = result.requests.map((r: any) => ({
          ...r,
          status: r.status as any
        }))
        setInboxRequests(mappedRequests)
        if (mappedRequests.length > 0 && currentView === 'inbox') {
          setSelectedRequest(mappedRequests[0])
        }
      } else {
        setError(result.error || "فشل في تحميل صندوق الوارد")
      }
    } catch (err) {
      console.error("Failed to fetch inbox:", err)
      setError("حدث خطأ في الاتصال بقاعدة البيانات")
    } finally {
      setLoading(false)
    }
  }

  const fetchHistoryData = async () => {
    try {
      const { getEmployeeHistory } = await import("@/app/actions/employee")
      const result = await getEmployeeHistory(userData.university_id)
      if (result.success && result.history) {
        setHistoryRequests(result.history)
      }
    } catch (err) {
      console.error("Failed to fetch history:", err)
    }
  }



  const fetchStats = async () => {
    try {
      const result = await getEmployeeStats(userData.university_id)
      if (result.success && result.data) {
        setStats(result.data)
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    }
  }

  const fetchAvailableForms = async () => {
    try {
      const result = await getAvailableFormTemplates(userData.university_id)
      if (result.success && result.data) {
        setAvailableForms(result.data.map(form => ({
          id: form.form_id.toString(),
          label: form.name,
          icon: "📝"
        })))
      }
    } catch (err) {
      console.error("Failed to fetch available forms:", err)
    }
  }



  // History detail states

  const handleViewHistory = async (requestId: string) => {
    setHistoryLoading(true)
    setSelectedHistoryItem(true) // Set to true/placeholder to open sheet immediately
    try {
      const { getRequestDetail } = await import("@/app/actions/student")
      const result = await getRequestDetail(parseInt(requestId), userData.university_id)
      if (result.success && result.data) {
        setSelectedHistoryItem(result.data)
      } else {
        // Handle error, maybe close sheet
        console.error(result.error)
        setSelectedHistoryItem(null)
      }
    } catch (e) {
      console.error(e)
      setSelectedHistoryItem(null)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Requester Interaction History
  const [requesterHistoryDialog, setRequesterHistoryDialog] = useState<{
    open: boolean
    loading: boolean
    data: any[]
    applicantName: string
    selectedRequestType: string | null
    startDate: string | null
    endDate: string | null
    textSearch: string
    requesterBio?: { name: string; university_id: string; department?: string | null; college?: string | null; email?: string | null; phone?: string | null } | null
  }>({ open: false, loading: false, data: [], applicantName: "", selectedRequestType: null, startDate: null, endDate: null, textSearch: "", requesterBio: null })

  const handleViewRequesterHistory = async (applicantName: string) => {
    setRequesterHistoryDialog({ open: true, loading: true, data: [], applicantName, selectedRequestType: null, startDate: null, endDate: null, textSearch: "", requesterBio: null })
    try {
      const { getRequesterInteractionHistory } = await import("@/app/actions/employee")
      const result = await getRequesterInteractionHistory(userData.university_id, applicantName)
      if (result.success && result.interactions) {
        setRequesterHistoryDialog(prev => ({
          ...prev,
          loading: false,
          data: result.interactions,
          requesterBio: result.requesterBio
        }))
      } else {
        setRequesterHistoryDialog(prev => ({ ...prev, loading: false }))
      }
    } catch (error) {
      console.error("Failed to fetch history", error)
      setRequesterHistoryDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const openActionDialog = (type: 'approve' | 'reject' | 'approve_with_changes' | 'reject_with_changes') => {
    setActionDialog({ open: true, type })
    // Pre-fill comment with template if needed? No.
  }

  const executeAction = async (dialogComment: string) => {
    if (!selectedRequest || !actionDialog.type) return

    setIsProcessing(true)
    setError(null)

    try {
      const fullComment = internalNote
        ? `[ملاحظة داخلية]: ${internalNote}\n\n${dialogComment}`
        : dialogComment

      const result = await processRequest(
        selectedRequest.id,
        actionDialog.type,
        fullComment,
        userData.university_id,
        attachment?.content,
        attachment?.name
      )

      if (result.success) {
        // Refresh inbox
        await fetchInboxData()
        await fetchStats()
        // setActionComment("") // Removed
        setInternalNote("")
        setAttachment(null)
        setSelectedRequest(null)
        setActionDialog({ open: false, type: null })
      } else {
        setError(result.error || "فشل في تنفيذ الإجراء")
        setActionDialog({ open: false, type: null })
      }
    } catch (err) {
      console.error("Failed to process request:", err)
      setError("حدث خطأ غير متوقع")
      setActionDialog({ open: false, type: null })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStatClick = (type: 'pending' | 'approved' | 'rejected' | 'returned') => {
    if (type === 'pending') {
      setCurrentView("inbox");
    } else {
      fetchHistoryData(); // Refreshes history data to ensure it's up to date
      setCurrentView("history");
      if (type === 'approved') setHistorySearchQuery("موافق");
      if (type === 'rejected') setHistorySearchQuery("مرفوض");
      if (type === 'returned') setHistorySearchQuery("معاد");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "قيد الانتظار", className: "bg-yellow-100 text-yellow-800" },
      processing: { label: "قيد المراجعة", className: "bg-blue-100 text-blue-800" },
      approved: { label: "موافق عليه", className: "bg-green-100 text-green-800" },
      rejected: { label: "مرفوض", className: "bg-red-100 text-red-800" },
      returned: { label: "معاد للتعديل", className: "bg-orange-100 text-orange-800" },
    }
    const config = statusMap[status] || statusMap.pending
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const requestTypes = availableForms

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Header
        userType={userData.role}
        userName={userData.full_name}
        onLogout={onLogout}
        onMenuClick={() => setIsMobileMenuOpen(true)}
        userId={userData.university_id}
      />

      <div className="flex flex-1">

        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <Sidebar
            currentView={currentView}
            onViewChange={(view) => setCurrentView(view as any)}
            userRole="employee"
            permissions={permissions}
          />
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
              userRole="employee"
              permissions={permissions}
              className="h-full border-none w-full"
            />
          </SheetContent>
        </Sheet>

        <main className="flex-1">
          {/* My Requests View */}
          {currentView === "requests" && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">طلباتي</h2>
              {myRequests.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title="لا توجد طلبات"
                  description="لم تقم بتقديم أي طلبات بعد. اضغط على 'طلب جديد' لتقديم طلبك الأول."
                  action={{
                    label: "تقديم طلب جديد",
                    onClick: () => setCurrentView("submit")
                  }}
                />
              ) : (
                <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
                  <div className="w-full md:w-1/3 border border-border bg-card rounded-lg">
                    <RequestList
                      requests={myRequests.map(r => ({ ...r, title: r.type }))}
                      selectedId={selectedRequest?.id}
                      onSelect={(id) => {
                        const req = myRequests.find(r => r.id === id)
                        if (req) setSelectedRequest(req)
                      }}
                    />
                  </div>
                  <div className="w-full md:w-2/3 flex flex-col bg-slate-50/50 p-6 rounded-lg border border-border/50">
                    {selectedRequest ? (
                      <RequestDetail
                        request={selectedRequest}
                        onEdit={(selectedRequest.status === 'pending' || selectedRequest.status === 'returned' || (selectedRequest.status as string) === 'rejected_with_changes') ? () => {
                          setEditingRequestId(selectedRequest.id)
                          setCurrentView("submit")
                        } : undefined}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                          <p>اختر طلباً لعرض التفاصيل</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inbox View */}
          {currentView === "inbox" && (
            <>
              {loading ? (
                <div className="p-6">
                  <DashboardSkeleton />
                </div>
              ) : error ? (
                <div className="p-6">
                  <ErrorMessage error={error} onRetry={fetchInboxData} />
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="p-6 border-b bg-muted/30">
                    <h2 className="text-2xl font-bold mb-4">الإحصائيات</h2>
                    <RequestStats stats={stats} onStatClick={handleStatClick} />
                  </div>

                  {/* Inbox Content */}
                  {inboxRequests.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        icon="✅"
                        title="لا توجد طلبات قيد الانتظار"
                        description="صندوق الوارد فارغ. سيتم عرض الطلبات الجديدة هنا."
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      {/* Requests List */}
                      <InboxRequestList
                        requests={inboxRequests}
                        selectedRequestId={selectedRequest?.id}
                        onSelectRequest={setSelectedRequest}
                        onViewHistory={handleViewRequesterHistory}
                      />

                      {/* Request Detail */}
                      <div className="w-full md:w-2/3 flex flex-col p-6 bg-slate-50/50 rounded-lg border border-border/50">
                        {selectedRequest ? (
                          <div className="space-y-6">
                            {/* Premium Header */}
                            <div className="overflow-hidden rounded-xl border border-orange-100 shadow-md">
                              {/* Gradient Banner */}
                              <div className="relative bg-gradient-to-l from-orange-400/75 to-orange-300/60 p-5">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
                                <div className="relative">
                                  <h2 className="text-xl font-bold text-white drop-shadow-sm mb-1">
                                    {selectedRequest.type}
                                  </h2>
                                  <p className="text-white/70 text-sm mb-2">
                                    {selectedRequest.description || "لا يوجد وصف"}
                                  </p>
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-sm w-fit">
                                    {getStatusBadge(selectedRequest.status)}
                                  </div>
                                </div>
                              </div>

                              {/* Info Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 bg-white">
                                {/* Applicant Info */}
                                <div className="p-5 border-b md:border-b-0 md:border-l border-orange-50">
                                  <p className="text-xs font-semibold text-orange-500/80 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="w-4 h-px bg-orange-300 inline-block"/>
                                    مقدم الطلب
                                  </p>
                                  <div className="space-y-2.5">
                                    <p
                                      className="font-bold text-lg text-orange-500 hover:underline cursor-pointer leading-tight"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewRequesterHistory(selectedRequest.applicant)
                                      }}
                                    >
                                      {selectedRequest.applicant}
                                    </p>
                                    {(selectedRequest as any).college && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                                        </span>
                                        <div>
                                          <p className="text-xs text-muted-foreground">الكلية</p>
                                          <p className="font-semibold text-foreground">{(selectedRequest as any).college}</p>
                                        </div>
                                      </div>
                                    )}
                                    {(selectedRequest as any).department && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                                        </span>
                                        <div>
                                          <p className="text-xs text-muted-foreground">القسم</p>
                                          <p className="font-semibold text-foreground">{(selectedRequest as any).department}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Request Meta */}
                                <div className="p-5 bg-orange-50/30">
                                  <p className="text-xs font-semibold text-orange-500/80 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="w-4 h-px bg-orange-300 inline-block"/>
                                    معلومات الطلب
                                  </p>
                                  <div className="space-y-2.5">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                                      </span>
                                      <div>
                                        <p className="text-xs text-muted-foreground">رقم الطلب</p>
                                        <p className="font-mono font-bold text-foreground text-base">{selectedRequest.id}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                      </span>
                                      <div>
                                        <p className="text-xs text-muted-foreground">تاريخ التقديم</p>
                                        <p className="font-semibold text-foreground">{selectedRequest.date}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                      </span>
                                      <div>
                                        <p className="text-xs text-muted-foreground">نوع الطلب</p>
                                        <p className="font-semibold text-foreground">{selectedRequest.type}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Request Content Details */}
                            <Card>
                              <CardHeader>
                                <CardTitle>تفاصيل الطلب</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {Array.isArray(selectedRequest.formSchema) && selectedRequest.submissionData && Object.keys(selectedRequest.submissionData).length > 0 ? (
                                  selectedRequest.formSchema.map((field: any) => {
                                    if (field.type === 'section') {
                                      return (
                                        <h5 key={field.id} className="font-bold text-base text-primary border-b pb-2 mt-4 mb-2">
                                          {field.label}
                                        </h5>
                                      )
                                    }

                                    const value = selectedRequest.submissionData?.[field.key];
                                    if (value === undefined || value === null || value === '') return null;

                                    return (
                                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b last:border-0 pb-2 last:pb-0">
                                        <span className="text-sm font-medium text-muted-foreground md:col-span-1">{field.label}:</span>
                                        <span className="text-sm font-semibold text-foreground md:col-span-2 break-words whitespace-pre-wrap">
                                          {typeof value === 'boolean' ? (value ? 'نعم' : 'لا') :
                                            field.type === 'file' ? (
                                              typeof value === 'string' ? (
                                                /* Render file preview */
                                                (() => {
                                                  const isDataUrl = value.startsWith('data:')
                                                  const isImage = isDataUrl ? value.startsWith('data:image') : /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(value)
                                                  const isPdf = isDataUrl ? value.startsWith('data:application/pdf') : /\.pdf$/i.test(value)

                                                  if (isImage) {
                                                    return (
                                                      <div
                                                        className="mt-2 text-center cursor-pointer hover:opacity-95 transition-opacity"
                                                        onClick={() => setFilePreview({
                                                          open: true,
                                                          type: 'image',
                                                          content: value,
                                                          name: field.label
                                                        })}
                                                      >
                                                        <NextImage
                                                          src={value}
                                                          alt="Attached file"
                                                          width={400}
                                                          height={300}
                                                          className="max-w-full h-auto max-h-[300px] rounded-md border border-border mx-auto object-contain"
                                                          unoptimized={true}
                                                        />
                                                      </div>
                                                    )
                                                  }

                                                  return (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => {
                                                        setFilePreview({
                                                          open: true,
                                                          type: isPdf ? 'pdf' : 'other',
                                                          content: value,
                                                          name: field.label
                                                        })
                                                      }}
                                                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                                    >
                                                      <FileText className="w-4 h-4" />
                                                      {isPdf ? 'عرض ملف PDF' : 'عرض الملف'}
                                                    </Button>
                                                  )
                                                })()
                                              ) : (
                                                <span className="text-muted-foreground italic">
                                                  لا يوجد ملف (أو تنسيق غير مدعوم)
                                                </span>
                                              )
                                            ) :
                                              field.type === 'date' ? new Date(value).toLocaleDateString('ar-EG') :
                                                String(value)}
                                        </span>
                                      </div>
                                    )
                                  })
                                ) : selectedRequest.submissionData && Object.keys(selectedRequest.submissionData).length > 0 ? (
                                  (() => {
                                    const orderedKeys = [
                                      "type", "delegatee_name", "delegatee_university_id",
                                      "start_date", "end_date", "reason", "delegated_types"
                                    ];
                                    const entries = Object.entries(selectedRequest.submissionData);
                                    entries.sort(([keyA], [keyB]) => {
                                      const a = orderedKeys.indexOf(keyA);
                                      const b = orderedKeys.indexOf(keyB);
                                      if (a === -1 && b === -1) return 0;
                                      if (a === -1) return 1;
                                      if (b === -1) return -1;
                                      return a - b;
                                    });

                                    return entries.map(([key, value]) => {
                                      const labels: Record<string, string> = {
                                        type: "نوع الطلب",
                                        delegatee_university_id: "الرقم الوظيفي للزميل",
                                        delegatee_name: "اسم الموظف المفوض (الزميل)",
                                        start_date: "تاريخ بداية التفويض",
                                        end_date: "تاريخ نهاية التفويض",
                                        reason: "سبب التفويض",
                                        delegated_types: "نماذج الطلبات المفوضة"
                                      }

                                      let displayValue = String(value)
                                      if (key === 'type' && value === 'SYSTEM_DELEGATION') displayValue = "طلب تفويض نظامي"
                                      else if (key.includes('date') && typeof value === 'string') {
                                        try { displayValue = new Date(value).toLocaleDateString('ar-SA') } catch(e) {}
                                      } else if (key === 'delegated_types') {
                                        if (value === null) displayValue = "إدارة كافة الصلاحيات الحالية وأنواع الطلبات"
                                        else if (Array.isArray(value)) displayValue = `محدد (${value.length} نماذج)`
                                      }
                                      
                                      return (
                                      <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b last:border-0 pb-2 last:pb-0">
                                        <span className="text-sm font-medium text-muted-foreground md:col-span-1">{labels[key] || key}:</span>
                                        <span className="text-sm font-semibold text-foreground md:col-span-2">{displayValue}</span>
                                      </div>
                                      )
                                    })
                                  })()
                                ) : (
                                  <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded border border-yellow-200">⚠️ لم يتم العثور على بيانات لهذا الطلب (بيانات فارغة)</p>
                                )}
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>إجراء على الطلب</CardTitle>
                                <CardDescription>قم بالموافقة أو الرفض مع إضافة تعليق</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {!hasPermission('review_requests') ? (
                                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
                                    <p className="text-yellow-800 font-medium">⚠️ ليس لديك صلاحية لمراجعة الطلبات</p>
                                    <p className="text-yellow-600 text-sm mt-1">يرجى التواصل مع المدير لمنحك الصلاحيات المطلوبة</p>
                                  </div>
                                ) : (
                                  <div className="space-y-6">
                                    {/* Internal Note */}
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        📝 ملاحظات إدارية (داخلية فقط)
                                      </Label>
                                      <Textarea
                                        placeholder="اكتب ملاحظات للموظف التالي أو للإدارة (لن تظهر للطالب)..."
                                        value={internalNote}
                                        onChange={(e) => setInternalNote(e.target.value)}
                                        className="bg-slate-50 min-h-[80px] resize-none"
                                      />
                                    </div>

                                    {/* Attachment */}
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        📎 إرفاق ملف (اختياري)
                                      </Label>
                                      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-md border border-input border-dashed">
                                        <Input
                                          type="file"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                              const reader = new FileReader()
                                              reader.onloadend = () => {
                                                setAttachment({ name: file.name, content: reader.result as string })
                                              }
                                              reader.readAsDataURL(file)
                                            } else {
                                              setAttachment(null)
                                            }
                                          }}
                                          className="text-right border-0 bg-transparent shadow-none p-0 h-auto"
                                        />
                                      </div>
                                      {attachment && (
                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                          <CheckCircle className="w-3 h-3" />
                                          تم اختيار: {attachment.name}
                                        </p>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3 pt-6 border-t border-border mt-4">
                                      <Button
                                        onClick={() => openActionDialog('approve')}
                                        variant="outline"
                                        className="w-full h-12 text-base font-bold shadow-sm border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-all"
                                      >
                                        <CheckCircle className="w-5 h-5 me-2" />
                                        موافقة على الطلب
                                      </Button>
                                      
                                      <div className="grid grid-cols-2 gap-3 w-full">
                                        <Button
                                          onClick={() => openActionDialog('reject_with_changes')}
                                          variant="outline"
                                          className="w-full h-11 border-orange-200 text-orange-600 bg-orange-50/50 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-sm"
                                        >
                                          <Redo2 className="w-4 h-4 me-2" />
                                          إعادة للتعديل
                                        </Button>
                                        <Button
                                          onClick={() => openActionDialog('reject')}
                                          variant="outline"
                                          className="w-full h-11 border-red-200 text-red-600 bg-red-50/30 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                                        >
                                          <XCircle className="w-4 h-4 me-2" />
                                          رفض نهائي
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            اختر طلباً من القائمة
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* History View */}
          {currentView === "history" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">سجل الإجراءات</h2>
                <div className="relative w-64">
                  <Input
                    placeholder="بحث في السجل..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>الإجراءات السابقة</CardTitle>
                  <CardDescription>سجل بجميع القرارات التي اتخذتها على الطلبات</CardDescription>
                </CardHeader>
                <CardContent>
                  {historyRequests.length > 0 ? (
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                          <tr className="text-right">
                            <th className="p-3 font-medium">رقم الطلب</th>
                            <th className="p-3 font-medium">نوع الطلب</th>
                            <th className="p-3 font-medium">مقدم الطلب</th>
                            <th className="p-3 font-medium">الرقم الجامعي</th>

                            <th className="p-3 font-medium">التاريخ</th>
                            <th className="p-3 font-medium">ملاحظاتك</th>
                            <th className="p-3 font-medium">الحالة الحالية</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyRequests
                            .filter((item) => {
                              if (!historySearchQuery) return true
                              const query = historySearchQuery.toLowerCase()
                              
                              const statusMap: Record<string, string> = {
                                pending: "قيد الانتظار",
                                processing: "قيد المراجعة",
                                approved: "موافق عليه",
                                rejected: "مرفوض",
                                returned: "معاد للتعديل",
                              }
                              const statusLabel = statusMap[item.status] || ""

                              return (
                                item.requestId?.toString().includes(query) ||
                                item.requestType?.toLowerCase().includes(query) ||
                                item.applicant?.toLowerCase().includes(query) ||
                                item.applicantId?.toLowerCase().includes(query) ||
                                item.comment?.toLowerCase().includes(query) ||
                                statusLabel.includes(query)
                              )
                            })
                            .map((item) => (
                            <tr
                              key={item.id}
                              className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                              onClick={() => handleViewHistory(item.requestId)}
                            >
                              <td className="p-3 font-mono">{item.requestId}</td>
                              <td className="p-3">{item.requestType}</td>
                              <td className="p-3">{item.applicant}</td>
                              <td className="p-3 font-mono">{item.applicantId}</td>

                              <td className="p-3">
                                {new Date(item.timestamp).toLocaleDateString('ar-SA')}
                                <span className="text-xs text-muted-foreground block text-right">
                                  {new Date(item.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="p-3 max-w-[200px] truncate" title={item.comment}>
                                <span className="text-primary hover:underline font-medium">عرض التفاصيل</span>
                              </td>
                              <td className="p-3">
                                {getStatusBadge(item.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon="📅"
                      title="السجل فارغ"
                      description="لم تقم بأي إجراءات بعد."
                    />
                  )}
                </CardContent>
              </Card>

              {/* History Item Detail Dialog */}
              <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
                <DialogContent className="sm:max-w-2xl w-[95vw] md:w-full max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>تفاصيل الطلب (من السجل)</DialogTitle>
                  </DialogHeader>
                  <div className="p-1">
                    {historyLoading ? (
                      <div className="p-4 space-y-4">
                        <div className="h-4 bg-muted animate-pulse rounded w-1/4"></div>
                        <div className="h-32 bg-muted animate-pulse rounded"></div>
                      </div>
                    ) : selectedHistoryItem && selectedHistoryItem !== true ? (
                      <div className="mt-4">
                        <RequestDetail
                          request={selectedHistoryItem}
                          showHistory={true}
                        />
                      </div>
                    ) : null}
                  </div>
                </DialogContent>
              </Dialog>



            </div>
          )}

          {/* Submit Request View */}
          {currentView === "submit" && (
            <div className="p-6 max-w-4xl">
              {!selectedRequestType && !editingRequestId ? (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 inline-flex items-center gap-2">
                        <Sparkles className="w-8 h-8 text-primary" />
                        إنشاء طلب جديد
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableForms.filter(f => f.label.toLowerCase().includes(formSearchQuery.toLowerCase())).length > 0 ? (
                      availableForms
                        .filter(f => f.label.toLowerCase().includes(formSearchQuery.toLowerCase()))
                        .map((form, index) => (
                          <div
                            key={form.id}
                            onClick={() => setSelectedRequestType(form.id)}
                            className="group relative overflow-hidden bg-card hover:bg-gradient-to-br hover:from-primary/5 hover:to-transparent border border-border/50 hover:border-primary/50 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                          >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                            
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
                                {form.label}
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
                  requestType={selectedRequestType || myRequests.find(r => r.id === editingRequestId)?.formId || ""}
                  requestTypes={availableForms}
                  userId={userData.university_id}
                  onBack={() => {
                    setSelectedRequestType(null)
                    setEditingRequestId(null)
                    if (editingRequestId) setCurrentView("requests")
                  }}
                  onSubmit={() => {
                    setSelectedRequestType(null)
                    setEditingRequestId(null)
                    setCurrentView("requests")
                    fetchMyRequests()
                  }}
                  initialData={editingRequestId ? myRequests.find(r => r.id === editingRequestId)?.submissionData : undefined}
                  requestId={editingRequestId || undefined}
                  isEditing={!!editingRequestId}
                />
              )}
            </div>
          )}

          {/* Forms Management View */}
          {currentView === "forms" && hasPermission('manage_forms') && (
            <AdminFormsPage onBack={() => setCurrentView("requests")} currentUserId={userData.university_id} />
          )}

          {/* Workflows Management View */}
          {currentView === "workflows" && hasPermission('manage_workflows') && (
            <WorkflowsEditor onBack={() => setCurrentView("requests")} currentUserId={userData.university_id} />
          )}

          {/* Users Management View */}
          {currentView === "users" && hasPermission('manage_users') && (
            <AdminUsersPage onBack={() => setCurrentView("requests")} currentUserId={userData.university_id} />
          )}

          {/* Departments Management View */}
          {currentView === "departments" && hasPermission('manage_departments') && (
            <AdminDepartmentsPage onBack={() => setCurrentView("requests")} currentUserId={userData.university_id} />
          )}

          {/* Reports View */}
          {currentView === "reports" && hasPermission('view_reports') && (
            <AdminReportsPage onBack={() => setCurrentView("requests")} />
          )}

          {/* Delegation View */}
          {currentView === "delegation" && (
            <div className="p-6">
              <DelegationRequest userData={userData} />
            </div>
          )}

          {/* Settings View */}
          {currentView === "settings" && (
            <div className="p-6 max-w-4xl">
              <h2 className="text-2xl font-bold mb-4">الإعدادات</h2>
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
                    <p className="text-sm text-muted-foreground">الرقم الوظيفي</p>
                    <p className="font-medium">{userData.university_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الدور</p>
                    <Badge>موظف</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Requester Interaction History Dialog */}
      <Dialog open={requesterHistoryDialog.open} onOpenChange={(open) => setRequesterHistoryDialog({ ...requesterHistoryDialog, open })}>
        <DialogContent dir="rtl" className="max-w-xl w-[90vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>سجل تعاملاتك السابقة</DialogTitle>
            <DialogDescription>
              الطلبات السابقة التي قمت بمعالجتها
            </DialogDescription>
          </DialogHeader>

          {/* Requester Bio Section */}
          {!requesterHistoryDialog.loading && requesterHistoryDialog.requesterBio && (
            <div className="bg-muted/50 p-4 rounded-lg mb-4 flex items-start gap-4 border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {requesterHistoryDialog.requesterBio.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-foreground">{requesterHistoryDialog.requesterBio.name}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>الرقم الجامعي: {requesterHistoryDialog.requesterBio.university_id}</p>
                  {requesterHistoryDialog.requesterBio.phone && (
                    <p>رقم الجوال: <span dir="ltr">{requesterHistoryDialog.requesterBio.phone}</span></p>
                  )}
                  {requesterHistoryDialog.requesterBio.email && (
                    <p>البريد الإلكتروني: <span dir="ltr">{requesterHistoryDialog.requesterBio.email}</span></p>
                  )}
                  {(requesterHistoryDialog.requesterBio.college || requesterHistoryDialog.requesterBio.department) && (
                    <p className="flex items-center gap-1">
                      {requesterHistoryDialog.requesterBio.college}
                      {requesterHistoryDialog.requesterBio.college && requesterHistoryDialog.requesterBio.department ? " - " : ""}
                      {requesterHistoryDialog.requesterBio.department}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Date \u0026 Text Filter Section */}
          {!requesterHistoryDialog.loading && (
            <div className="flex flex-wrap items-center gap-2 mb-4 bg-orange-50/50 p-2 rounded-lg border border-orange-100">
              {/* Text Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-2.5 top-2 h-4 w-4 text-orange-400" />
                <Input 
                  id="history-search" 
                  placeholder="بحث عن طلب، رقم، ملاحظة..."
                  className="h-8 bg-white border-orange-200 focus-visible:ring-orange-500 pr-8 text-xs"
                  value={requesterHistoryDialog.textSearch} 
                  onChange={(e) => setRequesterHistoryDialog(prev => ({ ...prev, textSearch: e.target.value }))} 
                />
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-orange-800">من:</span>
                  <Input 
                    type="date" 
                    className="h-8 w-[110px] text-xs px-2 py-1 bg-white border-orange-200 focus-visible:ring-orange-500"
                    value={requesterHistoryDialog.startDate || ""} 
                    onChange={(e) => setRequesterHistoryDialog(prev => ({ ...prev, startDate: e.target.value || null }))} 
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-orange-800">إلى:</span>
                  <Input 
                    type="date" 
                    className="h-8 w-[110px] text-xs px-2 py-1 bg-white border-orange-200 focus-visible:ring-orange-500"
                    value={requesterHistoryDialog.endDate || ""} 
                    onChange={(e) => setRequesterHistoryDialog(prev => ({ ...prev, endDate: e.target.value || null }))} 
                  />
                </div>

                {(requesterHistoryDialog.startDate || requesterHistoryDialog.endDate || requesterHistoryDialog.textSearch) && (
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => setRequesterHistoryDialog(prev => ({ ...prev, startDate: null, endDate: null, textSearch: "" }))}
                    className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                    title="مسح الفلاتر"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {requesterHistoryDialog.loading ? (
              <ListSkeleton />
            ) : requesterHistoryDialog.data.length > 0 ? (
              (() => {
                const filteredData = requesterHistoryDialog.data.filter((item) => {
                  let keep = true;
                  if (requesterHistoryDialog.startDate && item.date && item.date < requesterHistoryDialog.startDate) {
                    keep = false;
                  }
                  if (requesterHistoryDialog.endDate && item.date && item.date > requesterHistoryDialog.endDate) {
                    keep = false;
                  }
                  if (requesterHistoryDialog.textSearch) {
                    const query = requesterHistoryDialog.textSearch.toLowerCase();
                    const statusMap: Record<string, string> = {
                      pending: "قيد الانتظار",
                      processing: "قيد المراجعة",
                      approved: "موافق عليه",
                      rejected: "مرفوض",
                      returned: "معاد للتعديل",
                    }
                    const statusLabel = statusMap[item.originalStatus] || ""
                    const actionLabel = item.action === "reject" ? "مرفوض" :
                                        item.action === "approve_with_changes" ? "موافقة بتعديلات" :
                                        item.action === "reject_with_changes" ? "إعادة للتعديل" : 
                                        item.action === "approve" ? "موافق عليه" : item.action;

                    if (!(
                      (item.requestId && item.requestId.toString().includes(query)) ||
                      (item.requestType && item.requestType.toLowerCase().includes(query)) ||
                      (item.comment && item.comment.toLowerCase().includes(query)) ||
                      statusLabel.includes(query) ||
                      (actionLabel && actionLabel.includes(query))
                    )) {
                      keep = false;
                    }
                  }

                  return keep;
                });

                if (filteredData.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>لا توجد طلبات في هذا النطاق الزمني</p>
                    </div>
                  );
                }

                return (
              <>
                {requesterHistoryDialog.selectedRequestType === null ? (
                  // Statistics View
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base mb-1">إحصائيات الطلبات</h3>
                    {(() => {
                      // Calculate grouped stats
                      const groupedStats = filteredData.reduce((acc, item) => {
                        const type = item.requestType || "General";
                        if (!acc[type]) {
                          acc[type] = { total: 0, approved: 0, rejected: 0, returned: 0, pending: 0 };
                        }
                        acc[type].total++;
                        
                        // Let's use the final status as well if present, otherwise action
                        const statusOrAction = item.action;
                        if (statusOrAction === "approve" || statusOrAction === "approve_with_changes") {
                          acc[type].approved++;
                        } else if (statusOrAction === "reject") {
                          acc[type].rejected++;
                        } else if (statusOrAction === "reject_with_changes") {
                          acc[type].returned++;
                        } else {
                          acc[type].pending++;
                        }
                        return acc;
                      }, {} as Record<string, { total: number, approved: number, rejected: number, returned: number, pending: number }>);

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                          {(Object.entries(groupedStats) as [string, any][]).map(([type, stats]) => (
                            <div
                              key={type}
                              className="p-2.5 border rounded-xl bg-card hover:bg-muted/30 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                              onClick={() => setRequesterHistoryDialog(prev => ({ ...prev, selectedRequestType: type }))}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-base flex-1 line-clamp-2 leading-snug">
                                  {type}
                                </h4>
                                <div className="flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap ml-1 shrink-0">
                                  <span>الكل:</span>
                                  <span className="font-bold">{stats.total}</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-1 mt-auto">
                                <div className="flex flex-col items-center justify-center p-1 rounded-md bg-green-500/10 text-green-700">
                                  <span className="font-bold text-sm leading-none mb-1">{stats.approved}</span>
                                  <span className="text-[9px] font-medium text-center leading-none">موافق</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1 rounded-md bg-red-500/10 text-red-700">
                                  <span className="font-bold text-sm leading-none mb-1">{stats.rejected}</span>
                                  <span className="text-[9px] font-medium text-center leading-none">مرفوض</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1 rounded-md bg-blue-500/10 text-blue-700">
                                  <span className="font-bold text-sm leading-none mb-1">{stats.returned}</span>
                                  <span className="text-[9px] font-medium text-center leading-none">تعديل</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  // Detailed List View
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setRequesterHistoryDialog(prev => ({ ...prev, selectedRequestType: null }))}
                          className="flex items-center gap-1.5 border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 hover:border-orange-300 transition-all font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                          رجوع
                        </Button>
                        <h3 className="font-semibold text-lg">{requesterHistoryDialog.selectedRequestType}</h3>
                      </div>
                      <Badge variant="outline" className="font-normal text-xs">
                        {filteredData.filter(item => item.requestType === requesterHistoryDialog.selectedRequestType).length} طلبات
                      </Badge>
                    </div>

                    {filteredData
                      .filter((item) => item.requestType === requesterHistoryDialog.selectedRequestType)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-2 border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => {
                            handleViewHistory(item.requestId)
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs block">{item.requestType}</span>
                              <span className="text-[10px] text-muted-foreground mr-1">#{item.requestId}</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          <div className="flex justify-between items-center mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${item.action === "approve" ? "bg-green-100 text-green-800" :
                              item.action === "reject" ? "bg-red-100 text-red-800" :
                                "bg-blue-100 text-blue-800"
                              }`}>
                              {item.action === "approve" ? "تمت الموافقة" :
                                item.action === "reject" ? "تم الرفض" :
                                  item.action === "approve_with_changes" ? "موافقة بتعديلات" :
                                    item.action === "reject_with_changes" ? "إعادة للتعديل" : item.action}
                            </span>
                            <span className="text-[10px] text-muted-foreground dir-ltr">
                              {item.date}
                            </span>
                          </div>
                        </div>
                    ))}
                  </div>
                )}
              </>
                );
              })()
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا يوجد سجل تعاملات سابق لك مع هذا المستخدم</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RequestActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}
        type={actionDialog.type as ActionType}
        onConfirm={executeAction}
        isProcessing={isProcessing}
      />

      <FilePreviewDialog
        open={!!filePreview?.open}
        onOpenChange={(open) => !open && setFilePreview(null)}
        file={filePreview}
      />

    </div>
  )
}

