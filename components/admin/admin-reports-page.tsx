"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, TrendingUp, Users, FileText, CheckCircle, XCircle, Clock } from "lucide-react"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { ErrorMessage } from "@/components/ui/error-message"
import { getReportsData, getAuditLog } from "@/app/actions/admin"

interface AdminReportsPageProps {
  onBack: () => void
}

export default function AdminReportsPage({ onBack }: AdminReportsPageProps) {
  const [reports, setReports] = useState<any>(null)
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [reportsResult, auditResult] = await Promise.all([
        getReportsData(),
        getAuditLog({})
      ])

      if (reportsResult.success && reportsResult.data) {
        setReports(reportsResult.data)
      } else {
        setError(reportsResult.error || "فشل في تحميل التقارير")
      }

      if (auditResult.success && auditResult.data) {
        setAuditLog(auditResult.data)
      }
    } catch (err) {
      console.error("Failed to fetch data:", err)
      setError("حدث خطأ في الاتصال بقاعدة البيانات")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">التقارير والإحصائيات</h1>
          <Button onClick={onBack} variant="ghost">رجوع</Button>
        </div>
        <TableSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">التقارير والإحصائيات</h1>
          <Button onClick={onBack} variant="ghost">رجوع</Button>
        </div>
        <ErrorMessage error={error} onRetry={fetchData} />
      </div>
    )
  }

  const stats = reports?.stats || {}
  const byStatus = reports?.byStatus || []
  const byType = reports?.byType || []
  const recent = reports?.recentRequests || []

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">التقارير والإحصائيات</h1>
          <p className="text-sm text-muted-foreground mt-1">تحليلات شاملة للنظام</p>
        </div>
        <Button onClick={onBack} variant="ghost" className="gap-2">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">تمت الموافقة</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
            <XCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle>التوزيع حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byStatus.map((item: any) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.status === 'approved' ? 'bg-green-500' :
                      item.status === 'rejected' ? 'bg-red-500' :
                        item.status === 'pending' ? 'bg-yellow-500' :
                          'bg-gray-500'
                      }`} />
                    <span className="text-sm">{
                      item.status === 'approved' ? 'موافق عليها' :
                        item.status === 'rejected' ? 'مرفوضة' :
                          item.status === 'pending' ? 'قيد المراجعة' :
                            item.status === 'processing' ? 'قيد المعالجة' :
                              item.status
                    }</span>
                  </div>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
              {byStatus.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle>التوزيع حسب النوع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byType.map((item: any) => (
                <div key={item.type_name} className="flex items-center justify-between">
                  <span className="text-sm">{item.type_name}</span>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
              {byType.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>الطلبات الأخيرة</CardTitle>
          <CardDescription>آخر 10 طلبات تم تقديمها</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recent.map((request: any) => (
              <div key={request.request_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{request.requester?.full_name || "غير محدد"}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.form_templates?.name || "غير محدد"} • {new Date(request.submitted_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${request.status === 'approved' ? 'bg-green-100 text-green-700' :
                  request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                  }`}>
                  {
                    request.status === 'approved' ? 'موافق عليه' :
                      request.status === 'rejected' ? 'مرفوض' :
                        request.status === 'pending' ? 'قيد المراجعة' :
                          request.status === 'processing' ? 'قيد المعالجة' :
                            request.status
                  }
                </div>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد طلبات حديثة</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الأحداث</CardTitle>
          <CardDescription>آخر الإجراءات في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLog.slice(0, 20).map((log: any) => (
              <div key={log.log_id} className="flex items-start gap-3 p-3 border rounded-lg text-sm">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />
                <div className="flex-1">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.user?.full_name || "النظام"} • {new Date(log.timestamp).toLocaleString('ar-SA')}
                  </p>
                </div>
              </div>
            ))}
            {auditLog.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد أحداث</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
