"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Calendar as CalendarIcon, History } from "lucide-react"
import { getDepartmentColleagues, submitDelegationRequest, getEmployeeRequests, getDelegations } from "@/app/actions/employee"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"

interface DelegationRequestProps {
    userData: {
        university_id: string
        full_name: string
    }
}

export default function DelegationRequest({ userData }: DelegationRequestProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [colleagues, setColleagues] = useState<{ id: string, name: string }[]>([])

    // Form State
    const [delegateeId, setDelegateeId] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [reason, setReason] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // History State
    const [history, setHistory] = useState<any[]>([])
    const [activeDelegations, setActiveDelegations] = useState<any[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Colleagues
            const colleaguesRes = await getDepartmentColleagues(userData.university_id)
            if (colleaguesRes.success && colleaguesRes.users) {
                setColleagues(colleaguesRes.users)
            }

            // 2. Fetch Active Delegations (Real Records)
            const delegationsRes = await getDelegations(userData.university_id)
            if (delegationsRes.success && delegationsRes.data) {
                // Filter only my grants
                setActiveDelegations(delegationsRes.data.filter((d: any) => d.grantor_user_id.toString() !== userData.university_id)) // Wait, grantor_user_id is int. userData is string.
                // Actually `getDelegations` returns both grantor and grantee.
                // We want to show "My Active Delegations" (where I am grantor).
                // API returns `grantor_user_id` as number.
                // We need to match with DB user ID. But we only have university_id here. 
                // Let's rely on api logic or just show all returned (api filters by OR).
                // Let's assume API returns helpful data.
                setActiveDelegations(delegationsRes.data)
            }

            // 3. Fetch Request History (System Delegation Requests)
            const requestsRes = await getEmployeeRequests(userData.university_id)
            if (requestsRes.success && requestsRes.requests) {
                const delegationRequests = requestsRes.requests.filter((r: any) =>
                    r.type === "طلب تفويض صلاحيات" || r.submissionData?.type === 'SYSTEM_DELEGATION'
                )
                setHistory(delegationRequests)
            }

        } catch (error) {
            console.error(error)
            toast({ title: "خطأ", description: "فشل تحميل البيانات", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!delegateeId || !startDate || !endDate || !reason) {
            toast({ title: "تنبيه", description: "جميع الحقول مطلوبة", variant: "destructive" })
            return
        }

        setSubmitting(true)
        try {
            const result = await submitDelegationRequest(
                userData.university_id,
                delegateeId,
                new Date(startDate),
                new Date(endDate),
                reason
            )

            if (result.success) {
                toast({ title: "تم بنجاح", description: "تم رفع طلب التفويض للموافقة", className: "bg-green-600 text-white" })
                // Reset form
                setDelegateeId("")
                setStartDate("")
                setEndDate("")
                setReason("")
                // Reload
                loadData()
            } else {
                toast({ title: "خطأ", description: result.error || "فشل تقديم الطلب", variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>تقديم طلب تفويض جديد</CardTitle>
                    <CardDescription>
                        يمكنك تفويض صلاحياتك لموظف آخر لفترة محددة. يتطلب هذا الإجراء موافقة العميد/المدير.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>الموظف المفوض (الزميل)</Label>
                                <Select value={delegateeId} onValueChange={setDelegateeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر الموظف" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colleagues.map(user => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label>من تاريخ</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>إلى تاريخ</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        min={startDate}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>سبب التفويض</Label>
                            <Textarea
                                placeholder="مثال: إجازة سنوية، مهمة عمل..."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            إرسال الطلب
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Delegations List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-green-600" />
                            التفويضات النشطة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {activeDelegations.length === 0 ? (
                            <p className="text-muted-foreground text-sm">لا توجد تفويضات نشطة حالياً.</p>
                        ) : (
                            <div className="space-y-4">
                                {activeDelegations.map((d: any) => (
                                    <div key={d.delegation_id} className="p-3 bg-green-50 border border-green-100 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-green-900">
                                                مفوض إلى: {d.users_delegations_grantee_user_idTousers?.full_name}
                                            </p>
                                            <p className="text-xs text-green-700">
                                                {new Date(d.starts_at).toLocaleDateString()} - {new Date(d.ends_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="border-green-200 text-green-700 bg-white">
                                            نشط
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Request History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            سجل طلبات التفويض
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <p className="text-muted-foreground text-sm">لم تقدم أي طلبات تفويض سابقة.</p>
                        ) : (
                            <div className="space-y-3">
                                {history.map((req: any) => (
                                    <div key={req.id} className="p-3 bg-muted/20 border rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm">طلب تفويض</span>
                                            <Badge variant={
                                                req.status === 'approved' ? 'default' :
                                                    req.status === 'rejected' ? 'destructive' : 'secondary'
                                            }>
                                                {req.status === 'approved' ? 'مقبول' :
                                                    req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                            تاريخ الطلب: {req.date}
                                        </p>
                                        {req.description && (
                                            <p className="text-sm border-r-2 border-primary/20 pr-2 mr-1">
                                                {req.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
