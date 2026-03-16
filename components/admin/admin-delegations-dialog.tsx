"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getAdminDelegations, adminCreateDelegation, adminRevokeDelegation, getApproversList } from "@/app/actions/admin"
import { getAvailableFormTemplates } from "@/app/actions/forms"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Trash2, Plus, Calendar, ArrowRightLeft } from "lucide-react"

interface AdminDelegationsDialogProps {
  user: any
  currentUserId: string
  isOpen: boolean
  onClose: () => void
}

export function AdminDelegationsDialog({ user, currentUserId, isOpen, onClose }: AdminDelegationsDialogProps) {
  const { toast } = useToast()
  const [delegations, setDelegations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formTemplates, setFormTemplates] = useState<{ form_id: number, name: string }[]>([])
  const [colleagues, setColleagues] = useState<any[]>([])

  const [newDelegation, setNewDelegation] = useState({
    granteeId: "",
    startDate: "",
    endDate: "",
    reason: "",
    selectedTypes: [] as number[],
  })

  useEffect(() => {
    if (isOpen) {
      loadData()
    } else {
        setIsCreating(false)
    }
  }, [isOpen, user.user_id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [delRes, formsRes, usersRes] = await Promise.all([
        getAdminDelegations(user.user_id),
        getAvailableFormTemplates(user.university_id),
        getApproversList()
      ])

      if (delRes.success && delRes.data) {
        setDelegations(delRes.data)
      }
      if (formsRes.success && formsRes.data) {
        setFormTemplates(formsRes.data)
      }
      if (usersRes.success && usersRes.data) {
        // Filter out current user
        setColleagues(usersRes.data.users.filter((u: any) => u.user_id !== user.user_id))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newDelegation.granteeId || !newDelegation.startDate || !newDelegation.endDate || !newDelegation.reason) {
      toast({ title: "❌ خطأ", description: "يرجى ملء جميع الحقول المطلوبة (المفوض إليه، التواريخ، السبب)", variant: "destructive" })
      return
    }

    // Verify dates
    const start = new Date(newDelegation.startDate)
    const end = new Date(newDelegation.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (end < start) {
        toast({ title: "❌ خطأ", description: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية", variant: "destructive" })
        return
    }

    try {
      const res = await adminCreateDelegation(
        user.user_id,
        parseInt(newDelegation.granteeId),
        start,
        end,
        newDelegation.reason,
        newDelegation.selectedTypes.length > 0 ? newDelegation.selectedTypes : null,
        currentUserId
      )

      if (res.success) {
        toast({ title: "✅ تم إنشاء التفويض بنجاح" })
        setIsCreating(false)
        setNewDelegation({ granteeId: "", startDate: "", endDate: "", reason: "", selectedTypes: [] })
        loadData()
      } else {
        toast({ title: "❌ خطأ", description: res.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  const handleRevoke = async (delegationId: number) => {
    try {
      const res = await adminRevokeDelegation(delegationId, currentUserId)
      if (res.success) {
        toast({ title: "✅ تم إلغاء التفويض بنجاح" })
        loadData()
      } else {
         toast({ title: "❌ خطأ", description: res.error, variant: "destructive" })
      }
    } catch (err) {
       toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            إدارة تفويضات {user.full_name}
          </DialogTitle>
          <DialogDescription>
            يمكنك هنا عرض تفويضات الموظف وإنشاء تفويضات جديدة له.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pl-2 pr-1">
            
            <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg">
                <h3 className="font-semibold text-sm">التفويضات الحالية/السابقة</h3>
                <Button size="sm" onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "outline" : "default"} className="h-8">
                    {isCreating ? "إلغاء" : "إضافة تفويض جديد"}
                </Button>
            </div>

            {isCreating && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/10">
                <h4 className="font-medium text-sm text-primary mb-2">إضافة تفويض جديد (بصلاحيات الإدارة)</h4>
                
                <div className="space-y-2">
                  <Label>المفوض إليه (ينوب عن {user.full_name})</Label>
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newDelegation.granteeId}
                    onChange={e => setNewDelegation({...newDelegation, granteeId: e.target.value})}
                  >
                        <option value="">اختر الموظف البديل...</option>
                        {colleagues.map(c => (
                            <option key={c.user_id} value={c.user_id}>{c.full_name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>تاريخ البداية</Label>
                    <Input type="date" value={newDelegation.startDate} onChange={e => setNewDelegation({...newDelegation, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ النهاية</Label>
                    <Input type="date" value={newDelegation.endDate} onChange={e => setNewDelegation({...newDelegation, endDate: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                    <Label>سبب التفويض</Label>
                    <Textarea 
                        placeholder="السبب (إجازة، ظرف طارئ...)" 
                        value={newDelegation.reason}
                        onChange={e => setNewDelegation({...newDelegation, reason: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <Label>أنواع الطلبات المفوضة (اختياري)</Label>
                    <div className="text-xs text-muted-foreground mb-2">
                        إذا لم تختر شيئاً، سيتم تفويض كافة الصلاحيات الحالية.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-3 rounded-md bg-background max-h-40 overflow-y-auto">
                        {formTemplates.map((template) => (
                            <div key={template.form_id} className="flex items-center space-x-2 space-x-reverse">
                                <Checkbox 
                                    id={`admin-type-${template.form_id}`} 
                                    checked={newDelegation.selectedTypes.includes(template.form_id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setNewDelegation({...newDelegation, selectedTypes: [...newDelegation.selectedTypes, template.form_id]})
                                        } else {
                                            setNewDelegation({...newDelegation, selectedTypes: newDelegation.selectedTypes.filter(id => id !== template.form_id)})
                                        }
                                    }}
                                />
                                <label
                                    htmlFor={`admin-type-${template.form_id}`}
                                    className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {template.name}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button onClick={handleCreate}>حفظ وتفعيل التفويض</Button>
                </div>
              </div>
            )}

            {delegations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                    لا توجد تفويضات مسجلة
                </div>
            ) : (
                <div className="space-y-3">
                    {delegations.map(d => {
                        const isGrantor = d.grantor_user_id === user.user_id;
                        const otherPerson = isGrantor ? d.users_delegations_grantee_user_idTousers?.full_name : d.users_delegations_grantor_user_idTousers?.full_name;
                        
                        return (
                        <div key={d.delegation_id} className={`p-3 rounded-lg border ${d.is_active ? 'border-primary/30 bg-primary/5' : 'bg-muted/30 border-muted'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${isGrantor ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {isGrantor ? 'مفوِّض' : 'مفوَّض إليه'}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {d.is_active ? 'نشط' : 'ملغي'}
                                        </span>
                                    </div>
                                    <p className="font-medium text-sm">
                                        {isGrantor ? `فوّض: ${otherPerson}` : `ينوب عن: ${otherPerson}`}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(d.starts_at), 'dd MMM yyyy', { locale: arSA })} - {format(new Date(d.ends_at), 'dd MMM yyyy', { locale: arSA })}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 border-t pt-1 mt-2">السبب: {d.reason}</p>
                                </div>
                                {d.is_active && (
                                    <Button variant="ghost" size="sm" onClick={() => handleRevoke(d.delegation_id)} className="text-destructive h-8 px-2 text-xs">
                                        <Trash2 className="w-3 h-3 ml-1" />
                                        إلغاء
                                    </Button>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
