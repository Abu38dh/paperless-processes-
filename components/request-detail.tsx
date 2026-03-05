"use client"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle, Download, MessageSquare, Edit2, FileText } from "lucide-react"
import RequestTracking from "./student/request-tracking"
import NextImage from "next/image"

import { Request } from "@/types/schema"

interface RequestDetailProps {
  request: Request
  onEdit?: () => void
  onBack?: () => void
  userId?: string
  showHistory?: boolean
}

import { useEffect, useState } from "react"
import { getRequestActions } from "@/app/actions/student"

export interface RequestAction {
  id: string
  action: string
  timestamp: string
  actorName: string
  actorRole: string
  comment?: string
}

import { FilePreviewDialog } from "@/components/shared/file-preview-dialog"
import { generateOfficialPDF } from "@/lib/pdf-generator"

import { toast } from "sonner" 

import { translateRole } from "@/lib/translations"

export default function RequestDetail({ request, onEdit, onBack, userId, showHistory = true }: RequestDetailProps) {
// ... existing code ...

  const [history, setHistory] = useState<RequestAction[]>([])
  const [filePreview, setFilePreview] = useState<{ open: boolean; type: 'image' | 'pdf' | 'other'; content: string; name: string } | null>(null)

  useEffect(() => {
    if (showHistory) {
      const fetchHistory = async () => {
        const requestId = (request as any).request_id || request.id;
        if (!requestId) return;
        const actions = await getRequestActions(requestId.toString())
        setHistory(actions)
      }
      fetchHistory()
    }
  }, [request.id, (request as any).request_id, showHistory])

  const handleDownloadOfficialPDF = async () => {
    console.log("Download button clicked")
    console.log("Request status:", request.status)
    console.log("PDF Template present:", !!request.pdfTemplate)
    
    // Fallback template if none exists
    const templateToUse = request.pdfTemplate || `
      <div style="text-align: right; direction: rtl; font-family: 'Arial', sans-serif; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 30px; font-size: 24px; font-weight: bold; color: #0f172a;">وثيقة طلب رسمي</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: bold; width: 30%;">رقم المرجع</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">{RequestID}</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: bold; width: 30%;">التاريخ</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">{RequestDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: bold;">نوع الطلب</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;" colspan="3">{RequestType}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: bold;">مقدم الطلب</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">{StudentName}</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: bold;">الرقم الجامعي</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">{UniversityID}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: bold;">الكلية</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">{College}</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: bold;">القسم</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">{Department}</td>
          </tr>
        </table>

        <div style="margin-top: 30px; line-height: 1.8;">
          <p>تشهد جامعة العرب بأن الطالب/ة المذكور أعلاه قد تقدم بهذا الطلب الرسمي وتم تسجيله في النظام.</p>
          <p>وهذه وثيقة رسمية مبدئية لحين اعتماد النموذج النهائي.</p>
        </div>

        <div style="margin-top: 60px; display: flex; justify-content: space-between;">
           <div style="text-align: center;">
              <p style="margin-bottom: 10px; font-weight: bold;">اعتماد الكلية/القسم</p>
              <p>...........................</p>
           </div>
           <div style="text-align: center;">
              <p style="margin-bottom: 10px; font-weight: bold;">التوقيع</p>
              <p>...........................</p>
           </div>
        </div>
      </div>
    `

    try {
      console.log("Starting PDF generation...")
      const blob = await generateOfficialPDF({
        template: templateToUse,
        data: {
          ...request.submissionData,
          StudentName: request.applicant || request.users?.full_name || "الطالب",
          UniversityID: userId || request.users?.university_id || "---", 
          RequestID: request.reference_no || request.id,
          RequestDate: new Date(request.date).toLocaleDateString('ar-SA'),
          RequestType: request.type || "طلب عام",
          College: request.users?.departments_users_department_idTodepartments?.colleges?.name || "---",
          Department: request.users?.departments_users_department_idTodepartments?.dept_name || "---",
        }
      })
      console.log("PDF generated successfully, blob size:", blob.size)
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Document-${request.reference_no || request.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("تم تحميل الملف بنجاح")
    } catch (e) {
      console.error("PDF Generation failed", e)
      toast.error("فشل في إنشاء ملف PDF: " + (e as Error).message)
    }
  }

  const statusConfig = {
    pending: { color: "bg-secondary/10 text-secondary", icon: Clock, label: "قيد الانتظار" },
    approved: { color: "bg-primary/10 text-primary", icon: CheckCircle, label: "موافق عليه" },
    rejected: { color: "bg-red-100 text-red-800", icon: CheckCircle, label: "مرفوض" },
    processing: { color: "bg-blue-100 text-blue-800", icon: Clock, label: "قيد المراجعة" },
    approved_with_changes: { color: "bg-primary/10 text-primary", icon: CheckCircle, label: "موافق بتعديلات" },
    rejected_with_changes: { color: "bg-orange-100 text-orange-800", icon: Edit2, label: "معاد للتعديل" },
    returned: { color: "bg-orange-100 text-orange-800", icon: Edit2, label: "معاد للتعديل" },
  }

  const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = config.icon

  return (
    <div className="p-4 md:p-6 space-y-6" >
      <div>
        {/* Mobile Back Button */}
        {onBack && (
          <Button
            variant="ghost"
            className="md:hidden mb-4 pl-0 -mr-4 flex items-center text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 w-4 h-4"><path d="m9 18 6-6-6-6" /></svg>
            العودة
          </Button>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">{request.title || request.type || (request as any).form_templates?.name}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
            <StatusIcon className="w-4 h-4 inline ml-1" />
            {config.label}
          </span>
        </div>

        <div className="flex justify-between items-start">
            <p className="text-muted-foreground">{request.description || "لا يوجد وصف"}</p>
            {/* Download Official PDF Button */}
            {request.status === 'approved' && request.pdfTemplate && (
                <Button onClick={handleDownloadOfficialPDF} variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
                    <FileText className="w-4 h-4" />
                    تحميل الوثيقة الرسمية
                </Button>
            )}
        </div>
      </div>

      <Card className="p-4 bg-primary/5 border border-primary/20">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">نوع الطلب</p>
            <p className="font-semibold text-foreground">{request.type || (request as any).form_templates?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">تاريخ التقديم</p>
            <p className="font-semibold text-foreground">{request.date || new Date((request as any).submitted_at).toLocaleDateString('ar-SA')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">رقم الطلب</p>
            <p className="font-semibold text-foreground font-mono">{request.id || (request as any).request_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">الحالة</p>
            <p className="font-semibold text-foreground">{config.label}</p>
          </div>
        </div>
      </Card>

      {/* Applicant Header if available from API */}
      {(request.applicant || (request as any).users?.full_name) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">مقدم الطلب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">{request.applicant || (request as any).users?.full_name}</p>
                {((request as any).users?.university_id || userId) && (
                   <p className="text-sm text-muted-foreground">{(request as any).users?.university_id || userId}</p>
                )}
                {((request as any).applicantPhone || (request as any).users?.phone) && (
                   <p className="text-sm mt-1 text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{((request as any).applicantPhone || (request as any).users?.phone)}</p>
                )}
              </div>
              <div className="sm:text-left">
                {((request as any).users?.departments_users_department_idTodepartments?.colleges?.name || (request as any).college) && (
                   <p className="text-sm font-medium">الكلية: {((request as any).users?.departments_users_department_idTodepartments?.colleges?.name || (request as any).college)}</p>
                )}
                {((request as any).users?.departments_users_department_idTodepartments?.dept_name || (request as any).department) && (
                   <p className="text-sm text-muted-foreground">القسم: {((request as any).users?.departments_users_department_idTodepartments?.dept_name || (request as any).department)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Request Details (submission data) */}
      {(() => {
        // Handle both type structures
        const submissionData = request.submissionData || (request as any).submission_data;
        const schema = request.formSchema || (request as any).form_templates?.schema;

        if (Array.isArray(schema) && submissionData && Object.keys(submissionData).length > 0) {
          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">تفاصيل الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {schema.map((field: any) => {
                  if (field.type === 'section') {
                    return (
                      <h5 key={field.id} className="font-bold text-base text-primary border-b pb-2 mt-4 mb-2">
                        {field.label}
                      </h5>
                    )
                  }

                  const value = submissionData[field.key];
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
                                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 mt-1"
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
                })}
              </CardContent>
            </Card>
          )
        }
        return null;
      })()}

      {/* Prominently display the latest relevant comment if available */}
      {showHistory && history.length > 0 && history.find(a => a.comment && (a.action === 'returned' || a.action === 'rejected_with_changes' || a.action === 'rejected')) && (
        <Card className="p-4 bg-orange-50 border border-orange-200">
           <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
             <MessageSquare className="w-4 h-4" />
             سبب الإجراء (الملاحظات)
           </h3>
           <p className="text-orange-900 text-sm whitespace-pre-wrap">
             {history.find(a => a.comment && (a.action === 'returned' || a.action === 'rejected_with_changes' || a.action === 'rejected'))?.comment}
           </p>
           <p className="text-orange-700/70 text-xs mt-2">
             بواسطة: {history.find(a => a.comment && (a.action === 'returned' || a.action === 'rejected_with_changes' || a.action === 'rejected'))?.actorName}
           </p>
        </Card>
      )}

      {request.attachments && request.attachments.length > 0 && (
        <Card className="p-4 bg-muted/20 border border-slate-200">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Download className="w-4 h-4" />
            المرفقات
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {request.attachments.map((file: any, idx: number) => {
              // Handle different shapes of attachments if mapped or raw
              const fileName = file.storage_location ? file.storage_location.split('/').pop() : 'file';
              const fileUrl = file.storage_location || '#';
              const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(fileName)
              const isPdf = /\.pdf$/i.test(fileName) || fileUrl.startsWith('data:application/pdf')

              if (isImage || isPdf) {
                return (
                  <div
                    key={idx}
                    onClick={() => setFilePreview({
                      open: true,
                      type: isImage ? 'image' : 'pdf',
                      content: fileUrl,
                      name: fileName
                    })}
                    className="flex items-center justify-between p-2 bg-white rounded border hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="bg-slate-100 p-1.5 rounded text-slate-500">
                        {isPdf ? '📄' : '🖼️'}
                      </span>
                      <div className="truncate text-sm font-medium">{fileName}</div>
                    </div>
                    <span className="text-xs text-muted-foreground mr-2 shrink-0">عرض</span>
                  </div>
                )
              }

              return (
                <a
                  key={idx}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-white rounded border hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="bg-slate-100 p-1.5 rounded text-slate-500">
                      📎
                    </span>
                    <div className="truncate text-sm font-medium">{fileName}</div>
                  </div>
                  <span className="text-xs text-muted-foreground mr-2 shrink-0">تحميل</span>
                </a>
              )
            })}
          </div>
        </Card>
      )}

      <FilePreviewDialog
        open={!!filePreview?.open}
        onOpenChange={(open) => !open && setFilePreview(null)}
        file={filePreview}
      />

      {request.workflow && request.workflow.length > 0 && <RequestTracking workflow={request.workflow} />
      }

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">الإجراءات</h3>
        <div className="flex gap-3">
          {request.status === "approved" && (
            <Button onClick={handleDownloadOfficialPDF} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Download className="w-4 h-4" />
              تحميل الموافقة (PDF)
            </Button>
          )}
          {(request.status === "pending" || request.status === "returned" || (request.status as string) === "rejected_with_changes") && onEdit && (
            <Button onClick={onEdit} variant="outline" className="gap-2 bg-transparent">
              <Edit2 className="w-4 h-4" />
              تعديل
            </Button>
          )}
          <Button variant="outline" className="gap-2 bg-transparent">
            <MessageSquare className="w-4 h-4" />
            تعليق
          </Button>
        </div>
      </div >

      {showHistory && (
        <div className="bg-card border border-slate-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-foreground mb-4">سجل النشاطات</h3>
          <div className="relative space-y-8 pr-4 border-r border-slate-200">
            {history.length > 0 ? (
              history.map((action, index) => (
                <div key={action.id} className="relative">
                  <span className="absolute -right-[21px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {action.action === 'created' ? 'تم إنشاء الطلب' :
                         action.action === 'submitted' ? 'تم تقديم الطلب' :
                         (action.action === 'approved' || action.action === 'approve') ? 'تمت الموافقة' :
                         (action.action === 'rejected' || action.action === 'reject') ? 'تم الرفض' :
                         (action.action === 'rejected_with_changes' || action.action === 'reject_with_changes') ? 'إعادة للتعديل' :
                         action.action === 'returned' ? 'إعادة للتعديل' :
                         action.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        - {new Date(action.timestamp).toLocaleDateString('ar-SA')} {new Date(action.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80">
                      <span className="font-medium text-primary">{action.actorName}</span> ({translateRole(action.actorRole)})
                    </p>
                    {action.comment && (
                      <div className="mt-1 p-2 bg-slate-50 rounded text-xs text-muted-foreground border border-slate-100">
                        {action.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">لا يوجد سجل نشاطات لهذا الطلب</p>
            )}
          </div>
        </div>
      )
      }
    </div >
  )
}
