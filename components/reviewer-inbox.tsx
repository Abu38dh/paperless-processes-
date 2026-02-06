"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { AlertCircle, CheckCircle, MessageSquare, Redo2, Ban, RotateCcw, ArrowRight, Search } from "lucide-react"

interface ReviewerInboxProps {
  onBack: () => void
}

interface PendingRequest {
  id: string
  requestNumber: string
  requestType: string
  submittedBy: string
  previousStage: string
  waitingTime: string
  date: string
  status: "pending" | "approved" | "approved_with_changes" | "rejected_with_changes" | "rejected"
  submissionData?: any
  formSchema?: any
  rejectedBy?: string
}

type RequestStatus = "pending" | "approved" | "approved_with_changes" | "rejected_with_changes" | "rejected"

export default function ReviewerInbox({ onBack }: ReviewerInboxProps) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved": return "موافق عليه"
      case "approved_with_changes": return "موافق بتعديلات"
      case "rejected": return "مرفوض"
      case "rejected_with_changes": return "معاد للتعديل"
      case "pending": return "قيد الانتظار"
      default: return status
    }
  }

  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null)
  const [notes, setNotes] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending")
  const [loading, setLoading] = useState(true)
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: "approved" | "approved_with_changes" | "rejected_with_changes" | "rejected" | null
  }>({ open: false, action: null })

  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean
    loading: boolean
    data: any[]
    applicantName: string
  }>({ open: false, loading: false, data: [], applicantName: "" })

  useEffect(() => {
    async function fetchData() {
      const employeeId = "EMP001"
      try {
        const { getEmployeeInbox } = await import("@/app/actions/employee")
        const result = await getEmployeeInbox(employeeId)

        if (result.success && result.requests) {
          const mappedRequests: PendingRequest[] = result.requests.map((r: any) => ({
            id: r.id,
            requestNumber: `REQ-${r.id}`, // or r.reference_no if available
            requestType: r.type,
            submittedBy: r.applicant,
            previousStage: "System",
            waitingTime: "New",
            date: r.date,
            status: "pending",
            submissionData: r.submissionData,
            formSchema: r.formSchema
          }))
          setRequests(mappedRequests)
          if (mappedRequests.length > 0) setSelectedRequest(mappedRequests[0])
        }
      } catch (err) {
        console.error("Failed to fetch inbox", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleAction = async (action: "approved" | "approved_with_changes" | "rejected_with_changes" | "rejected") => {
    if (!selectedRequest) return

    // Optimistic update
    const updatedRequests = requests.map((req) => {
      if (req.id === selectedRequest.id) {
        return {
          ...req,
          status: action as RequestStatus,
          rejectedBy: action === "rejected" ? "Employee" : req.rejectedBy,
        }
      }
      return req
    })
    setRequests(updatedRequests)

    // Call Server Action
    try {
      const { processRequest } = await import("@/app/actions/employee")
      // Map UI status to API action
      const apiAction =
        action === "approved" ? "approve" :
          action === "rejected" ? "reject" :
            action === "approved_with_changes" ? "approve_with_changes" :
              action === "rejected_with_changes" ? "reject_with_changes" : "approve"
      await processRequest(selectedRequest.id, apiAction, notes, "EMP001", attachment?.content, attachment?.name)
    } catch (e) {
      console.error("Failed to process request", e)
    }

    const updatedRequest = updatedRequests.find((req) => req.id === selectedRequest.id)
    if (updatedRequest) {
      setSelectedRequest(updatedRequest)
    }

    setNotes("")
    setAttachment(null)
    setActionDialog({ open: false, action: null })
  }

  const handleViewHistory = async (applicantName: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selecting the request row
    setHistoryDialog({ open: true, loading: true, data: [], applicantName })
    try {
      const { getRequesterInteractionHistory } = await import("@/app/actions/employee")
      const result = await getRequesterInteractionHistory("EMP001", applicantName)
      if (result.success && result.interactions) {
        setHistoryDialog(prev => ({ ...prev, loading: false, data: result.interactions }))
      } else {
        setHistoryDialog(prev => ({ ...prev, loading: false }))
      }
    } catch (error) {
      console.error("Failed to fetch history", error)
      setHistoryDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleResubmit = () => {
    if (!selectedRequest) return
    const updatedRequests = requests.map((req) => {
      if (req.id === selectedRequest.id) {
        return { ...req, status: "pending" as RequestStatus, rejectedBy: undefined }
      }
      return req
    })

    setRequests(updatedRequests)
    const updatedRequest = updatedRequests.find((req) => req.id === selectedRequest.id)
    if (updatedRequest) {
      setSelectedRequest(updatedRequest)
    }
  }

  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (activeTab === "pending") return req.status === "pending"
    if (activeTab === "approved") return req.status === "approved" || req.status === "approved_with_changes"
    if (activeTab === "rejected") return req.status === "rejected" || req.status === "rejected_with_changes"

    return false
  })

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">صندوق الوارد</h1>
          <p className="text-muted-foreground">الطلبات المنتظرة لموافقتك</p>
        </div>
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الطلب أو الاسم..."
              className="pr-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
              <TabsTrigger value="approved">موافق عليه</TabsTrigger>
              <TabsTrigger value="rejected">مرفوض</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {activeTab === "pending" ? "الطلبات الواردة" :
                  activeTab === "approved" ? "الطلبات الموافق عليها" : "الطلبات المرفوضة"}
              </CardTitle>
              <CardDescription>{filteredRequests.length} طلبات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedRequest?.id === request.id
                    ? "border-primary bg-primary/10"
                    : "border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-foreground text-sm">{request.requestNumber}</h3>
                    <Badge className={
                      request.status === "pending" ? "bg-secondary/10 text-secondary" :
                        request.status === "approved" ? "bg-primary/10 text-primary" :
                          request.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                    }>{request.status === "pending" ? request.waitingTime : getStatusLabel(request.status)}</Badge>
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <p
                      className="text-xs text-foreground font-medium hover:text-primary hover:underline cursor-pointer transition-colors"
                      onClick={(e) => handleViewHistory(request.submittedBy, e)}
                    >
                      {request.submittedBy}
                    </p>
                    <span className="text-[10px] text-muted-foreground bg-slate-100 px-1 rounded">سجل سابق</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{request.requestType}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Request Details & Actions */}
        <div className="lg:col-span-2">
          {selectedRequest ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedRequest.requestNumber}</CardTitle>
                    <CardDescription>{selectedRequest.requestType}</CardDescription>
                  </div>
                  {selectedRequest.status !== "pending" && (
                    <Badge
                      className={`${selectedRequest.status === "approved"
                        ? "bg-primary/10 text-primary"
                        : selectedRequest.status === "approved_with_changes"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                        }`}
                    >
                      {selectedRequest.status === "approved"
                        ? "✓ موافق"
                        : selectedRequest.status === "approved_with_changes"
                          ? "✓ موافق بتعديلات"
                          : "✕ معاد للتعديل"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">مقدم الطلب</h4>
                    <p
                      className="text-foreground hover:text-primary hover:underline cursor-pointer"
                      onClick={(e) => handleViewHistory(selectedRequest.submittedBy, e)}
                    >
                      {selectedRequest.submittedBy}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">الجهة السابقة</h4>
                    <p className="text-foreground">{selectedRequest.previousStage}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">وقت الانتظار</h4>
                    <p className="text-foreground">{selectedRequest.waitingTime}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">التاريخ</h4>
                    <p className="text-foreground">{selectedRequest.date}</p>
                  </div>
                </div>

                {/* Request Details */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">تفاصيل الطلب</h4>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-200">
                    {Array.isArray(selectedRequest.formSchema) && selectedRequest.submissionData ? (
                      selectedRequest.formSchema.map((field: any) => {
                        if (field.type === 'section') {
                          return (
                            <h5 key={field.id} className="font-bold text-base text-primary border-b pb-2 mt-4 mb-2">
                              {field.label}
                            </h5>
                          )
                        }

                        const value = selectedRequest.submissionData[field.key];
                        // Skip rendering if value is empty and not boolean/number
                        if (value === undefined || value === null || value === '') return null;

                        return (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <span className="text-sm font-medium text-muted-foreground md:col-span-1">{field.label}:</span>
                            <span className="text-sm font-semibold text-foreground md:col-span-2 break-words whitespace-pre-wrap">
                              {/* Handle different value types */}
                              {typeof value === 'boolean' ? (value ? 'نعم' : 'لا') :
                                field.type === 'file' ? 'تم إرفاق ملف (معاينة غير متاحة)' :
                                  field.type === 'date' ? new Date(value).toLocaleDateString('ar-EG') :
                                    String(value)}
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      selectedRequest.submissionData ? (
                        Object.entries(selectedRequest.submissionData).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <span className="text-sm font-medium text-muted-foreground md:col-span-1">{key}:</span>
                            <span className="text-sm font-semibold text-foreground md:col-span-2">{String(value)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic">لا توجد مسودة بيانات للعرض</p>
                      )
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">ملاحظاتك</h4>
                  <Textarea
                    placeholder="أضف ملاحظاتك وأسباب قرارك..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-24"
                  />
                </div>

                {selectedRequest.status === "pending" ? (
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
                    <Button
                      onClick={() => setActionDialog({ open: true, action: "approved" })}
                      className="bg-primary hover:bg-primary/90 text-white gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      موافقة
                    </Button>
                    <Button
                      onClick={() => setActionDialog({ open: true, action: "approved_with_changes" })}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      موافقة بتعديلات
                    </Button>
                    <Button
                      onClick={() => setActionDialog({ open: true, action: "rejected_with_changes" })}
                      variant="outline"
                      className="border-secondary text-secondary hover:bg-secondary/10 bg-transparent gap-2"
                    >
                      <Redo2 className="w-4 h-4" />
                      إعادة للتعديل
                    </Button>
                    <Button
                      onClick={() => setActionDialog({ open: true, action: "rejected" })}
                      className="bg-red-600 hover:bg-red-700 text-white gap-2"
                    >
                      <Ban className="w-4 h-4" />
                      رفض نهائي
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-900 text-sm">تم معالجة هذا الطلب</p>
                          <p className="text-sm text-blue-800 mt-1">
                            {selectedRequest.status === "approved"
                              ? "تمت الموافقة على هذا الطلب وتم إرساله للمرحلة التالية"
                              : selectedRequest.status === "approved_with_changes"
                                ? "تمت الموافقة على هذا الطلب مع ملاحظات وسيتم إرساله للمرحلة التالية"
                                : "تم إعادة الطلب للطالب لإجراء تعديلات"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {selectedRequest.status === "rejected_with_changes" && (
                      <Button onClick={handleResubmit} variant="outline" className="w-full bg-transparent gap-2">
                        <MessageSquare className="w-4 h-4" />
                        إعادة تقييم الطلب
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border rounded-lg bg-slate-50">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>اختر طلباً لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "approved"
                ? "تأكيد الموافقة"
                : actionDialog.action === "approved_with_changes"
                  ? "موافقة بتعديلات"
                  : actionDialog.action === "rejected_with_changes"
                    ? "إعادة الطلب للتعديل"
                    : "رفض نهائي"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "approved"
                ? "هل تريد الموافقة على هذا الطلب؟"
                : actionDialog.action === "approved_with_changes"
                  ? "سيتم إرسال الطلب للمرحلة التالية مع ملاحظاتك"
                  : actionDialog.action === "rejected_with_changes"
                    ? "سيتم إشعار الطالب بضرورة تعديل الطلب وإعادة إرساله"
                    : "سيتم رفض الطلب بشكل نهائي"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground">ملاحظات (اختياري)</label>
              <Textarea
                placeholder="أضف أي ملاحظات إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-20 mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">إرفاق ملف (اختياري)</label>
              <div className="flex items-center gap-2">
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
                  className="text-right"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                يمكنك إرفاق ملف ليكون مرئياً للموظف التالي في المسار (مثل: كشف درجات، تقرير، إلخ).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: null })}
              className="bg-transparent"
            >
              إلغاء
            </Button>
            <Button
              onClick={() =>
                handleAction(
                  actionDialog.action as "approved" | "approved_with_changes" | "rejected_with_changes" | "rejected",
                )
              }
              className={`${actionDialog.action === "approved" || actionDialog.action === "approved_with_changes"
                ? "bg-primary hover:bg-primary/90"
                : "bg-red-600 hover:bg-red-700"
                } text-white`}
            >
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog.open} onOpenChange={(open) => setHistoryDialog({ ...historyDialog, open })}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>سجل تعاملاتك السابقة</DialogTitle>
            <DialogDescription>
              الطلبات السابقة لـ {historyDialog.applicantName} التي قمت بمعالجتها
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {historyDialog.loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : historyDialog.data.length > 0 ? (
              <div className="space-y-4">
                {historyDialog.data.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-slate-50 relative">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-semibold text-sm block">{item.requestType}</span>
                        <span className="text-xs text-muted-foreground">رقم الطلب: REQ-{item.requestId}</span>
                      </div>
                      <Badge className={
                        item.action === "approve" ? "bg-green-100 text-green-800" :
                          item.action === "reject" ? "bg-red-100 text-red-800" :
                            "bg-blue-100 text-blue-800"
                      }>
                        {item.action === "approve" ? "تمت الموافقة" :
                          item.action === "reject" ? "تم الرفض" :
                            item.action === "approve_with_changes" ? "موافقة بتعديلات" :
                              item.action === "reject_with_changes" ? "إعادة للتعديل" : item.action}
                      </Badge>
                    </div>
                    <div className="text-sm text-foreground mb-2 whitespace-pre-wrap">
                      <span className="font-medium ml-1">تعليقك:</span>
                      {item.comment || "لا يوجد تعليق"}
                    </div>
                    <div className="text-xs text-muted-foreground text-left" dir="ltr">
                      {item.date}
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
    </div >
  )
}
