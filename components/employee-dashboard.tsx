"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import { DashboardSkeleton, TableSkeleton } from "@/components/ui/loading-skeleton"
import { ErrorMessage } from "@/components/ui/error-message"
import { EmptyState } from "@/components/ui/empty-state"
import { getEmployeeInbox, getEmployeeStats, processRequest, getEmployeeRequests } from "@/app/actions/employee"
import { getAvailableFormTemplates } from "@/app/actions/forms"
import { CheckCircle, XCircle, Clock, FileText, RotateCcw, Redo2, Upload } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import AdminFormsPage from "@/components/admin/admin-forms-page"
import WorkflowsEditor from "@/components/admin/workflows-editor"
import AdminUsersPage from "@/components/admin/admin-users-page"
import AdminReportsPage from "@/components/admin/admin-reports-page"
import AdminDepartmentsPage from "@/components/admin/admin-departments-page"

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

  // Permission helper
  const hasPermission = (permission: string) => {
    return permissions.includes("all") || permissions.includes(permission)
  }

  // Data states
  const [inboxRequests, setInboxRequests] = useState<any[]>([])
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [historyRequests, setHistoryRequests] = useState<any[]>([])
  const [availableForms, setAvailableForms] = useState<any[]>([])
  const [stats, setStats] = useState({ totalActions: 0, approved: 0, rejected: 0, pending: 0 })
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionComment, setActionComment] = useState("")
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'approve' | 'reject' | 'approve_with_changes' | 'reject_with_changes' | null }>({
    open: false,
    type: null
  })
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null)
  const [internalNote, setInternalNote] = useState("")
  const [filePreview, setFilePreview] = useState<{ open: boolean; type: 'image' | 'pdf' | 'other'; content: string; name: string } | null>(null)

  useEffect(() => {
    fetchInboxData()
    fetchMyRequests()
    fetchStats()
    fetchAvailableForms()
    fetchHistoryData()
  }, [])

  const fetchMyRequests = async () => {
    try {
      const result = await getEmployeeRequests(userData.university_id)
      if (result.success && result.requests) {
        setMyRequests(result.requests)
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
        setInboxRequests(result.requests)
        if (result.requests.length > 0 && currentView === 'inbox') {
          setSelectedRequest(result.requests[0])
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
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

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

  const openActionDialog = (type: 'approve' | 'reject' | 'approve_with_changes' | 'reject_with_changes') => {
    setActionDialog({ open: true, type })
    // Pre-fill comment with template if needed? No.
  }

  const executeAction = async () => {
    if (!selectedRequest || !actionDialog.type) return

    setIsProcessing(true)
    setError(null)

    try {
      const fullComment = internalNote
        ? `[ملاحظة داخلية]: ${internalNote}\n\n${actionComment}`
        : actionComment

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
        setActionComment("")
        setInternalNote("")
        setAttachment(null)
        setSelectedRequest(null)
        setActionDialog({ open: false, type: null })
      } else {
        setError(result.error || "فشل في تنفيذ الإجراء")
        // Close dialog if error? Maybe keep open to retry?
        // Let's keep open if error so they can fix.
        // But we need to show error inside dialog or toast?
        // For now, error shows in main view. Let's close dialog to show it.
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
    }
    const config = statusMap[status] || statusMap.pending
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const requestTypes = availableForms

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Header
        userType={`موظف - ${userData.full_name}`}
        onLogout={onLogout}
        onMenuClick={() => setIsMobileMenuOpen(true)}
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
                    {selectedRequest && !selectedRequest.applicant ? (
                      /* Since we reused selectedRequest for both Inbox and MyRequests, we need to handle the shape. 
                         Here we are in My Requests view, selectedRequest should be from myRequests list. 
                      */
                      <RequestDetail
                        request={selectedRequest}
                        // Employee normally can't edit unless returned, similar to student
                        onEdit={(selectedRequest.status === 'pending' || selectedRequest.status === 'returned') ? () => {
                          // Handle edit logic if needed, or just show unavailable
                          // For now passing null/undefined if not implemented
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>قيد الانتظار</CardDescription>
                          <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>تم الموافقة</CardDescription>
                          <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>تم الرفض</CardDescription>
                          <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>إجمالي الإجراءات</CardDescription>
                          <CardTitle className="text-3xl">{stats.totalActions}</CardTitle>
                        </CardHeader>
                      </Card>
                    </div>
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
                      <div className="w-full md:w-1/3 border border-border bg-card rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold mb-4">صندوق الوارد ({inboxRequests.length})</h3>
                        {inboxRequests.map((req) => (
                          <Card
                            key={req.id}
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedRequest?.id === req.id ? "border-primary bg-primary/5" : ""
                              }`}
                            onClick={() => setSelectedRequest(req)}
                          >
                            <CardHeader className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <CardTitle className="text-base">{req.type}</CardTitle>
                                {getStatusBadge(req.status)}
                              </div>
                              <CardDescription className="text-sm">
                                مقدم من: {req.applicant}
                              </CardDescription>
                              <p className="text-xs text-muted-foreground mt-1">{req.date}</p>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>

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
                                  <p className="font-semibold">{selectedRequest.applicant}</p>
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

                                    const value = selectedRequest.submissionData[field.key];
                                    if (value === undefined || value === null || value === '') return null;

                                    return (
                                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b last:border-0 pb-2 last:pb-0">
                                        <span className="text-sm font-medium text-muted-foreground md:col-span-1">{field.label}:</span>
                                        <span className="text-sm font-semibold text-foreground md:col-span-2 break-words whitespace-pre-wrap">
                                          {typeof value === 'boolean' ? (value ? 'نعم' : 'لا') :
                                            field.type === 'file' ? (
                                              /* Render file preview */
                                              typeof value === 'string' && value.startsWith('data:') ? (
                                                value.startsWith('data:image') ? (
                                                  <div className="mt-2 text-center">
                                                    <img
                                                      src={value}
                                                      alt="Attached file"
                                                      className="max-w-full h-auto max-h-[300px] rounded-md border border-border mx-auto"
                                                    />
                                                  </div>
                                                ) : (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                      const isPdf = value.startsWith('data:application/pdf');
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
                                                    عرض الملف
                                                  </Button>
                                                )
                                              ) : (
                                                <span className="text-muted-foreground italic">تم إرفاق ملف (معاينة غير متاحة)</span>
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
              <h2 className="text-2xl font-bold mb-4">سجل الإجراءات</h2>
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
                            <th className="p-3 font-medium">الإجراء</th>
                            <th className="p-3 font-medium">التاريخ</th>
                            <th className="p-3 font-medium">ملاحظاتك</th>
                            <th className="p-3 font-medium">الحالة الحالية</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyRequests.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                              onClick={() => handleViewHistory(item.requestId)}
                            >
                              <td className="p-3 font-mono">{item.requestId}</td>
                              <td className="p-3">{item.requestType}</td>
                              <td className="p-3">{item.applicant}</td>
                              <td className="p-3">
                                <Badge variant={item.action === 'approve' ? 'default' : 'destructive'} className={item.action === 'approve' ? 'bg-green-600' : 'bg-red-600'}>
                                  {item.action === 'approve' ? 'موافقة' : 'رفض'}
                                </Badge>
                              </td>
                              <td className="p-3">
                                {new Date(item.timestamp).toLocaleDateString('ar-SA')}
                                <span className="text-xs text-muted-foreground block text-right">
                                  {new Date(item.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="p-3 max-w-[200px] truncate" title={item.comment}>
                                {item.comment || "-"}
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

              {/* History Detail Sheet */}
              <Sheet open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
                <SheetContent side="left" className="w-[400px] sm:w-[540px] overflow-y-auto">
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
                                      field.type === 'file' ? 'تم إرفاق ملف' :
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

                      {/* Workflow History Tracking can be added here if needed */}
                    </div>
                  ) : null}
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Submit Request View */}
          {currentView === "submit" && (
            <div className="p-6 max-w-4xl">
              {!selectedRequestType ? (
                <>
                  <h2 className="text-2xl font-bold text-foreground mb-4">إنشاء طلب جديد</h2>
                  <Card>
                    <CardHeader>
                      <CardTitle>نوع الطلب</CardTitle>
                      <CardDescription>اختر نوع الطلب الذي تريد تقديمه</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableForms.length > 0 ? (
                          availableForms.map((form) => (
                            <Button
                              key={form.id}
                              onClick={() => setSelectedRequestType(form.id)}
                              variant="outline"
                              className="h-auto py-4 justify-start text-right"
                            >
                              <span className="text-xl me-2">{form.icon || "📝"}</span>
                              {form.label}
                            </Button>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-8 text-muted-foreground border rounded-lg bg-slate-50">
                            <p>لا توجد نماذج متاحة حالياً</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <RequestSubmissionForm
                  requestType={selectedRequestType}
                  requestTypes={availableForms}
                  userId={userData.university_id}
                  onBack={() => setSelectedRequestType(null)}
                  onSubmit={() => {
                    setSelectedRequestType(null)
                    setCurrentView("requests")
                  }}
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

      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && setActionDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' ? 'تأكيد الموافقة' :
                actionDialog.type === 'reject' ? 'تأكيد الرفض' :
                  actionDialog.type === 'approve_with_changes' ? 'موافقة مع طلب تعديلات' :
                    'إعادة الطلب للتعديل'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' ? 'هل أنت متأكد من الموافقة على هذا الطلب؟' :
                actionDialog.type === 'reject' ? 'الرجاء ذكر سبب الرفض (إلزامي)' :
                  'الرجاء ذكر التعديلات المطلوبة من الطالب (إلزامي)'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-comment">
                {actionDialog.type === 'approve' ? 'ملاحظات (اختياري)' :
                  actionDialog.type === 'reject' ? 'سبب الرفض' :
                    'التعديلات المطلوبة'}
              </Label>
              <Textarea
                id="dialog-comment"
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={
                  actionDialog.type === 'approve' ? "أضف ملاحظاتك..." :
                    actionDialog.type === 'reject' ? "اكتب سبب الرفض..." :
                      "اشرح للطالب ما هي التعديلات المطلوبة..."
                }
                rows={5}
                className={
                  (actionDialog.type !== 'approve' && !actionComment.trim())
                    ? "border-red-200 focus-visible:ring-red-500"
                    : ""
                }
              />
              {actionDialog.type !== 'approve' && !actionComment.trim() && (
                <p className="text-xs text-red-500">* هذا الحقل مطلوب</p>
              )}
            </div>

          </div>


          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null })}
              disabled={isProcessing}
            >
              إلغاء
            </Button>
            <Button
              onClick={executeAction}
              disabled={
                isProcessing ||
                (actionDialog.type !== 'approve' && !actionComment.trim())
              }
              className={
                actionDialog.type === 'approve' || actionDialog.type === 'approve_with_changes'
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!filePreview?.open} onOpenChange={(open) => !open && setFilePreview(null)}>
        <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-6 text-primary" />
              {filePreview?.name || "معاينة الملف"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 overflow-hidden relative">
            {filePreview?.type === 'pdf' ? (
              <iframe
                src={filePreview.content}
                className="w-full h-full rounded-md bg-white shadow-sm"
                title="PDF Preview"
              />
            ) : filePreview?.type === 'image' ? (
              <img
                src={filePreview.content}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-md"
              />
            ) : (
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">لا يمكن معاينة هذا النوع من الملفات مباشرة داخل النظام.</p>
                <Button asChild>
                  <a href={filePreview?.content} download="downloaded-file">
                    <Upload className="w-4 h-4 me-2" />
                    تحميل الملف
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

