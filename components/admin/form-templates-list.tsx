"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Trash2, ArrowRight, Search, Filter } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { ErrorMessage } from "@/components/ui/error-message"
import { EmptyState } from "@/components/ui/empty-state"
import { getAllFormTemplates, deleteFormTemplate, publishFormTemplate, toggleFormStatus } from "@/app/actions/forms"
import { getAllColleges } from "@/app/actions/organizations"
import { useToast } from "@/hooks/use-toast"
import { WorkflowSelectionDialog } from "@/components/admin/workflow-selection-dialog"

interface FormTemplatesListProps {
  onEditForm: (id: string) => void
  onCreateNewForm: () => void
  onBack: () => void
}

export default function FormTemplatesList({ onEditForm, onCreateNewForm, onBack }: FormTemplatesListProps) {
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [audienceFilter, setAudienceFilter] = useState<"all" | "student" | "employee">("all")
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false)
  const [selectedAudience, setSelectedAudience] = useState<string>("all_students")
  const [pendingFormId, setPendingFormId] = useState<number | null>(null)
  const [pendingUnpublishId, setPendingUnpublishId] = useState<number | null>(null)
  const [selectedColleges, setSelectedColleges] = useState<number[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [colleges, setColleges] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchForms()
    loadCollegesAndDepartments()
  }, [])

  const loadCollegesAndDepartments = async () => {
    const result = await getAllColleges()
    if (result.success && result.data) {
      setColleges(result.data)
      const allDepts = result.data.flatMap((c: any) =>
        (c.departments || []).map((d: any) => ({ ...d, college_id: c.college_id }))
      )
      setDepartments(allDepts)
    }
  }

  const fetchForms = async () => {
    setError(null)

    try {
      const result = await getAllFormTemplates()

      if (result.success && result.data) {
        setForms(result.data)
      } else {
        setError(result.error || "فشل في تحميل النماذج")
      }
    } catch (err) {
      console.error("Failed to fetch forms:", err)
      setError("حدث خطأ في الاتصال بقاعدة البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: number) => {
    setItemToDelete(id)
    setDeleteDialogOpen(true)
  }

  const executeDelete = async () => {
    if (!itemToDelete) return

    try {
      const result = await deleteFormTemplate(itemToDelete)

      if (result.success) {
        toast({ title: result.message || "✅ تم الحذف بنجاح" })
        await fetchForms()
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      } else {
        toast({ title: "❌ فشل الحذف", description: result.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  const [pendingWorkflowName, setPendingWorkflowName] = useState<string | null>(null)
  // Store original config for comparison
  const [originalAudience, setOriginalAudience] = useState<any>(null)

  const handleToggleStatus = async (id: number, isActive: boolean) => {
    if (!isActive) {
      // Publish (Activate)
      setPendingFormId(id)
      setShowAudienceChangeWarning(false)

      // Find form to get current workflow and audience
      const form = forms.find(f => f.form_id === id)
      let workflowName = null

      if (form) {
        // 1. Get Workflow Name
        if (form.request_types) {
          const rt = Array.isArray(form.request_types) ? form.request_types[0] : form.request_types
          if (rt && rt.workflows) {
            const wf = Array.isArray(rt.workflows) ? rt.workflows[0] : rt.workflows
            workflowName = wf?.name
          }
        }

        // 2. Pre-select Audience
        if (form.audience_config) {
          const conf = form.audience_config as any
          setOriginalAudience(conf)

          if (conf.colleges?.length > 0 || conf.departments?.length > 0) {
            setSelectedAudience('specific')
            if (Array.isArray(colleges) && colleges.length) {
              setSelectedColleges(conf.colleges || [])
              setSelectedDepartments(conf.departments || [])
            }
          } else if (conf.student && (conf.employee === true)) {
            setSelectedAudience('all')
          } else if (conf.employee) {
            setSelectedAudience('all_employees')
          } else {
            setSelectedAudience('all_students')
          }
        } else {
          setSelectedAudience('all_students')
          setOriginalAudience(null)
        }
      }
      setPendingWorkflowName(workflowName)
      setPublishDialogOpen(true)
    } else {
      // Unpublish - show confirmation dialog
      setPendingUnpublishId(id)
      setUnpublishDialogOpen(true)
    }
  }

  const confirmUnpublish = async () => {
    if (!pendingUnpublishId) return

    try {
      const result = await toggleFormStatus(pendingUnpublishId, false)

      if (result.success) {
        toast({
          title: "✅ تم إلغاء النشر",
          description: "تم تعطيل النموذج بنجاح"
        })
        setUnpublishDialogOpen(false)
        setPendingUnpublishId(null)
        await fetchForms()
      } else {
        toast({
          title: "❌ فشل إلغاء النشر",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (err) {
      toast({
        title: "❌ خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive"
      })
    }
  }

  // Check for audience change logic
  const [showAudienceChangeWarning, setShowAudienceChangeWarning] = useState(false)
  const [workflowSelectionOpen, setWorkflowSelectionOpen] = useState(false)

  const getNewAudienceConfig = () => {
    return {
      student: selectedAudience === 'all_students' || selectedAudience === 'all' || (selectedAudience === 'specific' && (originalAudience?.student !== false)),
      employee: selectedAudience === 'all_employees' || selectedAudience === 'all' || (selectedAudience === 'specific' && (originalAudience?.employee !== false)),
      colleges: selectedAudience === 'specific' ? selectedColleges : [],
      departments: selectedAudience === 'specific' ? selectedDepartments : []
    }
  }

  const handleConfirmPublish = async () => {
    if (!pendingFormId) return

    // 1. Calculate New Audience Config
    const newConfig = getNewAudienceConfig()

    // 2. Compare if we have original audience and a workflow
    if (originalAudience && pendingWorkflowName && !showAudienceChangeWarning) {
      // Check for changes
      const isStudentChanged = !!newConfig.student !== (originalAudience.student !== false)
      const isEmployeeChanged = !!newConfig.employee !== (originalAudience.employee !== false)

      const arraysEqual = (a: any[], b: any[]) => {
        if ((!a || a.length === 0) && (!b || b.length === 0)) return true
        if (!a || !b) return false
        if (a.length !== b.length) return false
        const aSorted = [...a].sort()
        const bSorted = [...b].sort()
        return aSorted.every((val, index) => val === bSorted[index])
      }

      const isCollegesChanged = !arraysEqual(originalAudience.colleges || [], newConfig.colleges || [])
      const isDepartmentsChanged = !arraysEqual(originalAudience.departments || [], newConfig.departments || [])

      if (isStudentChanged || isEmployeeChanged || isCollegesChanged || isDepartmentsChanged) {
        setShowAudienceChangeWarning(true)
        return
      }
    }

    // Direct publish if no warning or approved
    executePublish(newConfig)
  }

  const handleWorkflowChangeClick = () => {
    // Open the workflow selection dialog
    // Keep pendingFormId set
    // Close publish warning
    setPublishDialogOpen(false)
    setShowAudienceChangeWarning(false)
    setWorkflowSelectionOpen(true)
  }

  const handleWorkflowSelectionConfirm = async (workflowData: any) => {
    if (!pendingFormId) return

    // We need to publish with BOTH new audience AND new workflow
    const newConfig = getNewAudienceConfig()
    await executePublish(newConfig, workflowData)

    setWorkflowSelectionOpen(false)
  }

  const executePublish = async (audienceConfig: any, workflowData?: any) => {
    try {
      const result = await publishFormTemplate(pendingFormId!, audienceConfig, workflowData)

      if (result.success) {
        toast({ title: "✅ تم النشر بنجاح" })
        setPublishDialogOpen(false)
        setShowAudienceChangeWarning(false)
        setPendingFormId(null)
        await fetchForms()
      } else {
        toast({ title: "❌ فشل النشر", description: result.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchTerm.toLowerCase())
    // For audience filter, check the target_audience JSON field
    const matchesAudience = audienceFilter === "all" ||
      (form.target_audience && form.target_audience.includes(audienceFilter))
    return matchesSearch && matchesAudience
  })

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إدارة النماذج</h1>
          <Button onClick={onBack} variant="outline">رجوع</Button>
        </div>
        <TableSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إدارة النماذج</h1>
          <Button onClick={onBack} variant="outline">رجوع</Button>
        </div>
        <ErrorMessage error={error} onRetry={fetchForms} />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 bg-card p-6 rounded-lg border shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة النماذج</h1>
            <p className="text-muted-foreground mt-1">قم بإدارة نماذج الطلبات، تفعيلها، أو تعديلها</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={onCreateNewForm} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              إنشاء نموذج جديد
            </Button>
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowRight className="w-4 h-4" />
              رجوع
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن نموذج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select
            value={audienceFilter}
            onValueChange={(value) => setAudienceFilter(value as any)}
          >
            <SelectTrigger className="w-[180px]" dir="rtl">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="تصفية حسب الجمهور" />
              </div>
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="student">الطلاب</SelectItem>
              <SelectItem value="employee">الموظفين</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredForms.length === 0 ? (
        <EmptyState
          icon="📋"
          title="لا توجد نماذج"
          description="لا توجد نماذج حالياً. قم بإنشاء نموذج جديد."
          action={{
            label: "إنشاء نموذج الآن",
            onClick: onCreateNewForm
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredForms.map((form) => (
            <Card key={form.form_id} className={`transition-all hover:shadow-md border-l-4 ${form.is_active ? 'border-l-primary' : 'border-l-slate-300'}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  {/* Form Info */}
                  <div className="flex items-start gap-4 flex-1 w-full">
                    <div className={`p-3 rounded-full ${form.is_active ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                      <Edit2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-foreground mb-1">{form.name}</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">
                          {form.target_audience === 'all_students' ? 'جميع الطلاب' :
                            form.target_audience === 'all_employees' ? 'جميع الموظفين' :
                              form.target_audience === 'specific' ? (() => {
                                const conf = form.audience_config
                                const parts = []
                                if (conf?.colleges?.length > 0) {
                                  const names = conf.colleges.map((id: number) => colleges.find(c => c.college_id === id)?.name).filter(Boolean)
                                  if (names.length > 0) parts.push(`كليات: ${names.join('، ')}`)
                                }
                                if (conf?.departments?.length > 0) {
                                  const names = conf.departments.map((id: number) => departments.find(d => d.department_id === id)?.dept_name).filter(Boolean)
                                  if (names.length > 0) parts.push(`أقسام: ${names.join('، ')}`)
                                }
                                return parts.length > 0 ? parts.join(' - ') : 'محدد'
                              })() : 'الكل'}
                        </Badge>
                        <span>•</span>
                        <span>{form.is_active ? 'منشور' : 'مسودة'}</span>
                        <span>•</span>
                        <span>آخر تعديل: {form.updated_at ? new Date(form.updated_at).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border">
                      <span className={`text-sm font-medium ${form.is_active ? 'text-primary' : 'text-slate-500'}`}>
                        {form.is_active ? 'مفعّل' : 'معطّل'}
                      </span>
                      <Switch
                        dir="ltr"
                        checked={form.is_active}
                        onCheckedChange={() => handleToggleStatus(form.form_id, form.is_active)}
                        className="data-[state=checked]:bg-primary ml-1"
                      />
                    </div>

                    <Button
                      onClick={() => onEditForm(form.form_id.toString())}
                      variant="outline"
                      className="gap-2 border-primary text-primary hover:bg-primary/5"
                    >
                      <Edit2 className="w-4 h-4" />
                      تعديل
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(form.form_id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md gap-4">
          <DialogHeader className="space-y-2">
            <DialogTitle>
              {showAudienceChangeWarning ? '⚠️ تغيير الجمهور المستهدف' : 'تحديد جمهور النموذج'}
            </DialogTitle>
            <DialogDescription>
              {showAudienceChangeWarning
                ? 'الجمهور الجديد مختلف عن الإعدادات الأصلية. هذا النموذج مرتبط بمسار عمل.'
                : 'لمن ترغب في إتاحة هذا النموذج؟'
              }
            </DialogDescription>
          </DialogHeader>

          {showAudienceChangeWarning ? (
            <div className="py-2">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm font-semibold text-amber-800 mb-1">مسار العمل الحالي:</p>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-white text-amber-900 border-amber-200">{pendingWorkflowName}</Badge>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  هل تريد الاستمرار بنفس المسار أم تغييره ليناسب الجمهور الجديد؟
                </p>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              {/* Display Workflow Info */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-between">
                <span className="text-sm text-slate-600">مسار العمل:</span>
                {pendingWorkflowName ? (
                  <Badge variant="secondary" className="bg-white shadow-sm border">{pendingWorkflowName}</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">لا يوجد مسار</Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">الجمهور المستهدف</Label>
                <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الجمهور" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all_students">جميع الطلاب</SelectItem>
                    <SelectItem value="all_employees">جميع الموظفين</SelectItem>
                    <SelectItem value="all">الجميع</SelectItem>
                    <SelectItem value="specific">محدد (كليات/أقسام)</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              {/* حقول تحديد الكليات والأقسام */}
              {selectedAudience === 'specific' && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-semibold mb-1">تخصيص الجمهور:</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">الكليات</Label>
                      <div className="h-[120px] overflow-y-auto border rounded-md bg-white p-2">
                        {colleges.length === 0 ? (
                          <p className="text-xs text-muted-foreground">لا توجد</p>
                        ) : (
                          colleges.map((college: any) => (
                            <label key={college.college_id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedColleges.includes(college.college_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedColleges([...selectedColleges, college.college_id])
                                  } else {
                                    setSelectedColleges(selectedColleges.filter(id => id !== college.college_id))
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-primary"
                              />
                              <span className="text-xs">{college.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">الأقسام</Label>
                      <div className="h-[120px] overflow-y-auto border rounded-md bg-white p-2">
                        {departments.length === 0 ? (
                          <p className="text-xs text-muted-foreground">لا يوجد</p>
                        ) : (
                          departments.map((dept: any) => (
                            <label key={dept.department_id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedDepartments.includes(dept.department_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDepartments([...selectedDepartments, dept.department_id])
                                  } else {
                                    setSelectedDepartments(selectedDepartments.filter(id => id !== dept.department_id))
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-primary"
                              />
                              <span className="text-xs">{dept.dept_name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {showAudienceChangeWarning ? (
              <>
                <Button variant="outline" size="sm" onClick={handleWorkflowChangeClick}>
                  تغيير المسار
                </Button>
                <Button size="sm" onClick={handleConfirmPublish}>
                  إبقاء ونشر
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setPublishDialogOpen(false)}>إلغاء</Button>
                <Button size="sm" onClick={handleConfirmPublish}>تأكيد النشر</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Selection Dialog */}
      <WorkflowSelectionDialog
        open={workflowSelectionOpen}
        onOpenChange={setWorkflowSelectionOpen}
        onConfirm={handleWorkflowSelectionConfirm}
      />

      {/* Unpublish Confirmation Dialog */}
      <Dialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md gap-4">
          <DialogHeader className="space-y-2">
            <DialogTitle>تأكيد إلغاء النشر</DialogTitle>
            <DialogDescription>
              سيتم إيقاف النموذج ولن يتمكن الطلاب/الموظفين من تعبئته.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-900">
              <div className="flex gap-2 items-start">
                <span className="text-lg">⚠️</span>
                <div className="space-y-1">
                  <p className="font-semibold">تنبيه هام</p>
                  <p className="text-xs text-orange-800 leading-relaxed">
                    إلغاء النشر لا يحذف البيانات السابقة، ولكن يمنع استقبال طلبات جديدة. يمكنك إعادة تفعيله في أي وقت.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setUnpublishDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={confirmUnpublish}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا النموذج؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف النموذج وجميع البيانات المرتبطة به نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
