"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Clock, CheckCircle, Download, MessageSquare, Edit2 } from "lucide-react"
import RequestTracking from "./student/request-tracking"

interface WorkflowStep {
  step: number
  department: string
  role: string
  status: "pending" | "approved" | "rejected" | "processing"
}

interface Request {
  id: string
  title: string
  type: string
  date: string
  status: "pending" | "approved" | "approved_with_changes" | "rejected_with_changes" | "rejected" | "processing"
  description: string
  workflow?: WorkflowStep[]
}

interface RequestDetailProps {
  request: Request
  onEdit?: () => void
  userId?: string
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

export default function RequestDetail({ request, onEdit }: RequestDetailProps) {
  const [history, setHistory] = useState<RequestAction[]>([])

  useEffect(() => {
    async function fetchHistory() {
      const actions = await getRequestActions(request.id)
      setHistory(actions)
    }
    fetchHistory()
  }, [request.id])

  const statusConfig = {
    pending: { color: "bg-secondary/10 text-secondary", icon: Clock, label: "قيد الانتظار" },
    approved: { color: "bg-primary/10 text-primary", icon: CheckCircle, label: "موافق عليه" },
    rejected: { color: "bg-red-100 text-red-800", icon: CheckCircle, label: "مرفوض" },
    processing: { color: "bg-blue-100 text-blue-800", icon: Clock, label: "قيد المراجعة" },
    approved_with_changes: { color: "bg-primary/10 text-primary", icon: CheckCircle, label: "موافق بتعديلات" },
    rejected_with_changes: { color: "bg-secondary/10 text-secondary", icon: Edit2, label: "معاد للتعديل" },
  }

  const config = statusConfig[request.status] || statusConfig.pending
  const StatusIcon = config.icon

  return (
    <div className="p-6 space-y-6" >
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">{request.title}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
            <StatusIcon className="w-4 h-4 inline ml-1" />
            {config.label}
          </span>
        </div>
        <p className="text-muted-foreground">{request.description}</p>
      </div>

      <Card className="p-4 bg-primary/5 border border-primary/20">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">نوع الطلب</p>
            <p className="font-semibold text-foreground">{request.type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">تاريخ التقديم</p>
            <p className="font-semibold text-foreground">{request.date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">رقم الطلب</p>
            <p className="font-semibold text-foreground font-mono">{request.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">الحالة</p>
            <p className="font-semibold text-foreground">{config.label}</p>
          </div>
        </div>
      </Card>

      {request.workflow && request.workflow.length > 0 && <RequestTracking workflow={request.workflow} />
      }

      < div className="space-y-3" >
        <h3 className="font-semibold text-foreground">الإجراءات</h3>
        <div className="flex gap-3">
          {request.status === "approved" && (
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Download className="w-4 h-4" />
              تحميل الموافقة (PDF)
            </Button>
          )}
          {(request.status === "pending" || request.status === "rejected_with_changes") && onEdit && (
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

      <div className="bg-card border border-slate-200 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-foreground mb-4">سجل النشاطات</h3>
        <div className="relative space-y-8 pr-4 border-r border-slate-200">
          {history.length > 0 ? (
            history.map((action, index) => (
              <div key={action.id} className="relative">
                <span className="absolute -right-[21px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{action.action}</span>
                    <span className="text-xs text-muted-foreground">
                      - {new Date(action.timestamp).toLocaleDateString('ar-SA')} {new Date(action.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">
                    <span className="font-medium text-primary">{action.actorName}</span> ({action.actorRole})
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
    </div >
  )
}
