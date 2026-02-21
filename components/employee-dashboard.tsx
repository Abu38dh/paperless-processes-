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
import { CheckCircle, XCircle, Clock, FileText, RotateCcw, Redo2, Upload, ExternalLink, Search, Sparkles, ChevronRight } from "lucide-react"
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
  const [currentView, setCurrentView] = useState<
    "requests" | "inbox" | "submit" | "reviews" | "forms" | "users" | "departments" | "reports" | "workflows" | "delegation" | "settings" | "history"
  >("requests")

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
  const [stats, setStats] = useState<RequestStatsType>({ totalActions: 0, approved: 0, rejected: 0, pending: 0 })
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
    const intervalId = setInterval(() => {
      // Only refresh sensitive data if tab is active (optional optimization)
      if (document.visibilityState === 'visible') {
        fetchInboxData()
        fetchStats()
      }
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(intervalId) // Cleanup on unmount
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
    requesterBio?: { name: string; university_id: string; department?: string; college?: string; email?: string } | null
  }>({ open: false, loading: false, data: [], applicantName: "", requesterBio: null })

  const handleViewRequesterHistory = async (applicantName: string) => {
    setRequesterHistoryDialog({ open: true, loading: true, data: [], applicantName, requesterBio: null })
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
                    <RequestStats stats={stats} />
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
                            <div>
                              <h2 className="text-2xl font-bold mb-2">{selectedRequest.type}</h2>
                              <p className="text-muted-foreground">{selectedRequest.description}</p>
                            </div>

                            <Card className="p-4 bg-muted/30">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">مقدم الطلب</p>
                                  <p
                                    className="font-semibold text-primary hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewRequesterHistory(selectedRequest.applicant)
                                    }}
                                  >
                                    {selectedRequest.applicant}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">تاريخ التقديم</p>
                                  <p className="font-semibold">{selectedRequest.date}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">رقم الطلب</p>
                                  <p className="font-semibold font-mono">{selectedRequest.id}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">الحالة</p>
                                  {getStatusBadge(selectedRequest.status)}
                                </div>
                              </div>
                            </Card>

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
                                  Object.entries(selectedRequest.submissionData).map(([key, value]) => (
                                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b last:border-0 pb-2 last:pb-0">
                                      <span className="text-sm font-medium text-muted-foreground md:col-span-1">{key}:</span>
                                      <span className="text-sm font-semibold text-foreground md:col-span-2">{String(value)}</span>
                                    </div>
                                  ))
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
                                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                      <Button
                                        onClick={() => openActionDialog('approve')}
                                        className="bg-green-600 hover:bg-green-700 w-full"
                                      >
                                        <CheckCircle className="w-4 h-4 me-2" />
                                        موافقة
                                      </Button>
                                      <Button
                                        onClick={() => openActionDialog('approve_with_changes')}
                                        className="bg-blue-600 hover:bg-blue-700 w-full"
                                      >
                                        <RotateCcw className="w-4 h-4 me-2" />
                                        موافقة بتعديلات
                                      </Button>
                                      <Button
                                        onClick={() => openActionDialog('reject_with_changes')}
                                        variant="outline"
                                        className="w-full"
                                      >
                                        <Redo2 className="w-4 h-4 me-2" />
                                        إعادة للتعديل
                                      </Button>
                                      <Button
                                        onClick={() => openActionDialog('reject')}
                                        variant="destructive"
                                        className="w-full"
                                      >
                                        <XCircle className="w-4 h-4 me-2" />
                                        رفض نهائي
                                      </Button>
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
                              return (
                                item.requestId?.toString().includes(query) ||
                                item.requestType?.toLowerCase().includes(query) ||
                                item.applicant?.toLowerCase().includes(query) ||
                                item.comment?.toLowerCase().includes(query)
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
        <DialogContent dir="rtl" className="max-w-2xl">
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

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {requesterHistoryDialog.loading ? (
              <ListSkeleton />
            ) : requesterHistoryDialog.data.length > 0 ? (
              <div className="space-y-3">
                {requesterHistoryDialog.data.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      /* Use handleViewHistory with item.requestId */
                      handleViewHistory(item.requestId)
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm block">{item.requestType}</span>
                        <span className="text-xs text-muted-foreground mr-1">#{item.requestId}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.action === "approve" ? "bg-green-100 text-green-800" :
                        item.action === "reject" ? "bg-red-100 text-red-800" :
                          "bg-blue-100 text-blue-800"
                        }`}>
                        {item.action === "approve" ? "تمت الموافقة" :
                          item.action === "reject" ? "تم الرفض" :
                            item.action === "approve_with_changes" ? "موافقة بتعديلات" :
                              item.action === "reject_with_changes" ? "إعادة للتعديل" : item.action}
                      </span>
                      <span className="text-xs text-muted-foreground dir-ltr">
                        {item.date}
                      </span>
                    </div>

                  </div>
                ))}
              </div>
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

      {/* History Detail Sheet - Moved to top level */}
      <Sheet open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
        <SheetContent side="left" className="w-[90%] sm:max-w-2xl overflow-y-auto">
          {historyLoading ? (
            <div className="flex justify-center items-center h-full">
              <DashboardSkeleton />
            </div>
          ) : selectedHistoryItem ? (
            <div className="space-y-6 pt-6">
              <SheetHeader className="px-0 mb-4">
                <SheetTitle className="text-2xl font-bold text-start">{selectedHistoryItem.form_templates?.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(selectedHistoryItem.status)}
                  <span className="text-sm text-muted-foreground">{new Date(selectedHistoryItem.submitted_at).toLocaleDateString('ar-SA')}</span>
                </div>
              </SheetHeader>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">مقدم الطلب</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{selectedHistoryItem.users?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedHistoryItem.users?.university_id}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">تفاصيل الطلب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.isArray(selectedHistoryItem.form_templates?.schema) && selectedHistoryItem.submission_data && Object.keys(selectedHistoryItem.submission_data).length > 0 ? (
                    selectedHistoryItem.form_templates.schema.map((field: any) => {
                      if (field.type === 'section') {
                        return (
                          <h5 key={field.id} className="font-bold text-base text-primary border-b pb-2 mt-4 mb-2">
                            {field.label}
                          </h5>
                        )
                      }

                      const value = selectedHistoryItem.submission_data[field.key];
                      if (value === undefined || value === null || value === '') return null;

                      return (
                        <div key={field.id} className="grid grid-cols-1 gap-1 border-b last:border-0 pb-2 last:pb-0">
                          <span className="text-sm font-medium text-muted-foreground">{field.label}:</span>
                          <span className="text-sm font-semibold text-foreground break-words whitespace-pre-wrap">
                            {typeof value === 'boolean' ? (value ? 'نعم' : 'لا') :
                              field.type === 'file' && typeof value === 'string' ? (
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
                                          width={300}
                                          height={200}
                                          className="max-w-full h-auto max-h-[200px] rounded-md border border-border mx-auto object-contain"
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
                              ) :
                                field.type === 'date' ? new Date(value).toLocaleDateString('ar-EG') :
                                  String(value)}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">لا توجد تفاصيل إضافية</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

