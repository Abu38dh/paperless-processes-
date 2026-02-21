"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import {
  FileText,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Upload,
  Heading3,
  Trash2,
  GripVertical,
  Copy,
  Eye,
  Save,
  UploadIcon,
  X,
  Plus,
  ArrowRight,
  Users,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { saveFormTemplate, publishFormTemplate, getFormTemplate } from "@/app/actions/forms"
import { getAllColleges } from "@/app/actions/organizations"

import { WorkflowSelectionDialog } from "@/components/admin/workflow-selection-dialog"
import PdfTemplateEditor from "@/components/admin/pdf-template-editor"

interface FormField {
  id: string
  label: string
  key: string
  type: "text" | "longtext" | "number" | "date" | "select" | "radio" | "checkbox" | "file" | "section"
  required: boolean
  placeholder?: string
  options?: { id: string; label: string }[]
}

interface FormBuilderEditorProps {
  formId: string
  onBack: () => void
  currentUserId?: string
}

const fieldTypes = [
  { id: "text", label: "نص قصير", icon: Type, color: "bg-blue-50 text-blue-700" },
  { id: "longtext", label: "نص طويل", icon: FileText, color: "bg-purple-50 text-purple-700" },
  { id: "number", label: "رقم", icon: Hash, color: "bg-primary/10 text-primary" },
  { id: "date", label: "تاريخ", icon: Calendar, color: "bg-secondary/10 text-secondary" },
  { id: "select", label: "قائمة منسدلة", icon: List, color: "bg-cyan-50 text-cyan-700" },
  { id: "radio", label: "اختيار واحد", icon: CheckSquare, color: "bg-indigo-50 text-indigo-700" },
  { id: "checkbox", label: "اختيارات متعددة", icon: CheckSquare, color: "bg-pink-50 text-pink-700" },
  { id: "file", label: "رفع ملف", icon: Upload, color: "bg-red-50 text-red-700" },
  { id: "section", label: "عنوان قسم", icon: Heading3, color: "bg-gray-50 text-gray-700" },
]

export default function FormBuilderEditor({ formId, onBack, currentUserId }: FormBuilderEditorProps) {
  const isNewForm = formId === "new"
  const [formName, setFormName] = useState("")
  const [fields, setFields] = useState<FormField[]>([])
  const [pdfTemplate, setPdfTemplate] = useState<string | undefined>(undefined)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false)
  const [savedFormId, setSavedFormId] = useState<number | null>(isNewForm ? null : parseInt(formId))
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(!isNewForm)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [stampUrl, setStampUrl] = useState<string | null>(null)

  // Workflow state
  const [workflowData, setWorkflowData] = useState<any>(null)
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null)

  // Audience targeting
  const [targetAudience, setTargetAudience] = useState<"student" | "employee" | "both" | "specific">("student")
  const [selectedColleges, setSelectedColleges] = useState<number[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [colleges, setColleges] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [specificRoleConfig, setSpecificRoleConfig] = useState({ student: true, employee: false })

  // Original state for change detection
  const [originalAudienceConfig, setOriginalAudienceConfig] = useState<any>(null)
  const [showAudienceWarning, setShowAudienceWarning] = useState(false)

  const { toast } = useToast()

  const selectedField = fields.find((f) => f.id === selectedFieldId)

  // Load form data when editing
  useEffect(() => {
    if (!isNewForm && formId) {
      loadFormData()
    }
  }, [formId, isNewForm])

  const loadFormData = async () => {
    setIsLoading(true)
    try {
      const result = await getFormTemplate(parseInt(formId))
      if (result.success && result.data) {
        setFormName(result.data.name || "")
        if (result.data.schema && Array.isArray(result.data.schema)) {
          const formFields = result.data.schema as unknown as FormField[]
          setFields(formFields)
          if (formFields.length > 0 && formFields[0]) {
            setSelectedFieldId(formFields[0].id)
          }
        }

        // Load PDF Template
        if ((result.data as any).pdf_template) {
            setPdfTemplate((result.data as any).pdf_template)
        }

        // Load Signature and Stamp
        if ((result.data as any).signature_url) {
            setSignatureUrl((result.data as any).signature_url)
        }
        if ((result.data as any).stamp_url) {
            setStampUrl((result.data as any).stamp_url)
        }

        // Load Audience Config
        if (result.data.audience_config) {
          const config = result.data.audience_config as any
          setOriginalAudienceConfig(config)

          if (config.colleges?.length > 0 || config.departments?.length > 0) {
            setTargetAudience("specific")
            setSelectedColleges(config.colleges || [])
            setSelectedDepartments(config.departments || [])
            setSpecificRoleConfig({
              student: config.student !== false,
              employee: config.employee !== false
            })
          } else if (config.student && config.employee) {
            setTargetAudience("both")
          } else if (config.employee) {
            setTargetAudience("employee")
          } else {
            setTargetAudience("student")
          }
        }

        // Load Workflow safely
        if (result.data.request_types) {
          const rt = result.data.request_types as any
          // Handle potential array/object mismatch
          const actualRt = Array.isArray(rt) ? rt[0] : rt

          if (actualRt && actualRt.workflows) {
            const wf = actualRt.workflows
            // Handle potential array/object mismatch for workflows
            const finalWf = Array.isArray(wf) ? wf[0] : wf

            console.log("Workflow loaded:", finalWf)
            setCurrentWorkflow(finalWf)
          }
        }
      } else {
        toast({
          title: "خطأ",
          description: result.error || "فشل في تحميل النموذج",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Load form error:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل النموذج",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load colleges and departments
  useEffect(() => {
    const loadData = async () => {
      const result = await getAllColleges()
      if (result.success && result.data) {
        setColleges(result.data)
        // Extract all departments
        const allDepts = result.data.flatMap((c: any) =>
          (c.departments || []).map((d: any) => ({ ...d, college_id: c.college_id }))
        )
        setDepartments(allDepts)
      }
    }
    loadData()
  }, [])

  const addField = (typeId: string) => {
    const fieldType = fieldTypes.find((t) => t.id === typeId)
    const newField: FormField = {
      id: Date.now().toString(),
      label: `حقل جديد - ${fieldType?.label}`,
      key: `field_${Date.now()}`,
      type: typeId as FormField["type"],
      required: false,
      options: ["select", "radio", "checkbox"].includes(typeId) ? [{ id: "1", label: "الخيار 1" }] : undefined,
    }
    setFields([...fields, newField])
    setSelectedFieldId(newField.id)
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id))
    if (selectedFieldId === id) {
      setSelectedFieldId(fields.length > 1 ? fields[0].id : null)
    }
  }

  const duplicateField = (id: string) => {
    const fieldToDuplicate = fields.find((f) => f.id === id)
    if (!fieldToDuplicate) return
    const newField: FormField = {
      ...fieldToDuplicate,
      id: Date.now().toString(),
      key: `${fieldToDuplicate.key}_copy`,
    }
    const index = fields.findIndex((f) => f.id === id)
    setFields([...fields.slice(0, index + 1), newField, ...fields.slice(index + 1)])
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedFieldId(id)
    e.dataTransfer.effectAllowed = "move"
    // Set a transparent image or just let default behavior happen, 
    // but identifying the dragged item is key.
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedFieldId || draggedFieldId === targetId) return

    const newFields = [...fields]
    const draggedIndex = newFields.findIndex((f) => f.id === draggedFieldId)
    const targetIndex = newFields.findIndex((f) => f.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Remove dragged item
    const [draggedItem] = newFields.splice(draggedIndex, 1)
    // Insert at new position
    newFields.splice(targetIndex, 0, draggedItem)

    setFields(newFields)
    setDraggedFieldId(null)
  }

  const handleDragEnd = () => {
    setDraggedFieldId(null)
  }

  const addOption = (fieldId: string) => {
    updateField(fieldId, {
      options: [...(selectedField?.options || []), { id: Date.now().toString(), label: "خيار جديد" }],
    })
  }

  const updateOption = (fieldId: string, optionId: string, label: string) => {
    const field = fields.find((f) => f.id === fieldId)
    if (field?.options) {
      updateField(fieldId, {
        options: field.options.map((o) => (o.id === optionId ? { ...o, label } : o)),
      })
    }
  }

  const deleteOption = (fieldId: string, optionId: string) => {
    const field = fields.find((f) => f.id === fieldId)
    if (field?.options) {
      updateField(fieldId, {
        options: field.options.filter((o) => o.id !== optionId),
      })
    }
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال اسم للنموذج قبل الحفظ",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await saveFormTemplate({
        form_id: savedFormId || undefined,
        name: formName,
        schema: fields,
        requesterId: currentUserId,
        pdf_template: pdfTemplate,
        signature_url: signatureUrl || undefined,
        stamp_url: stampUrl || undefined
      })

      if (result.success && result.data) {
        setSavedFormId(result.data.form_id)
        toast({
          title: "تم الحفظ بنجاح",
          description: `تم حفظ النموذج "${formName}" مع ${fields.length} حقول`,
          duration: 3000,
        })
      } else {
        toast({
          title: "فشل الحفظ",
          description: result.error || "حدث خطأ أثناء الحفظ",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getNormalizedAudienceConfig = () => {
    const config: any = {}
    if (targetAudience === 'student') {
      config.student = true
      config.employee = false
    } else if (targetAudience === 'employee') {
      config.student = false
      config.employee = true
    } else if (targetAudience === 'specific') {
      config.student = specificRoleConfig.student
      config.employee = specificRoleConfig.employee
      if (selectedColleges.length > 0) config.colleges = selectedColleges
      if (selectedDepartments.length > 0) config.departments = selectedDepartments
    } else {
      config.student = true
      config.employee = true
    }
    return config
  }

  const isAudienceChanged = () => {
    if (!originalAudienceConfig) return true

    const nextConfig = getNormalizedAudienceConfig()

    // Debug logging
    console.log("Audience Check - Original:", originalAudienceConfig)
    console.log("Audience Check - Next:", nextConfig)

    const arraysEqual = (a: any[], b: any[]) => {
      if ((!a || a.length === 0) && (!b || b.length === 0)) return true
      if (!a || !b) return false
      if (a.length !== b.length) return false
      const aSorted = [...a].sort()
      const bSorted = [...b].sort()
      return aSorted.every((val, index) => val === bSorted[index])
    }

    // Strict comparison
    const originalStudent = originalAudienceConfig.student === true
    const nextStudent = nextConfig.student === true
    if (originalStudent !== nextStudent) return true

    const originalEmployee = originalAudienceConfig.employee === true
    const nextEmployee = nextConfig.employee === true
    if (originalEmployee !== nextEmployee) return true

    if (!arraysEqual(originalAudienceConfig.colleges || [], nextConfig.colleges || [])) return true
    if (!arraysEqual(originalAudienceConfig.departments || [], nextConfig.departments || [])) return true

    return false
  }

  const handlePublish = () => {
    if (fields.length === 0) {
      toast({
        title: "خطأ",
        description: "يجب إضافة حقل واحد على الأقل قبل النشر",
        variant: "destructive",
        duration: 3000,
      })
      return
    }
    if (!formName.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال اسم للنموذج قبل النشر",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Check logic
    if (currentWorkflow) {
      if (isAudienceChanged()) {
        setShowAudienceWarning(true)
        return
      } else {
        // No change, keep existing workflow
        setWorkflowData({ mode: 'existing', workflowId: currentWorkflow.workflow_id })
        setShowPublishConfirm(true)
        return
      }
    }

    // New form or no workflow
    setShowWorkflowDialog(true)
  }

  const handleKeepWorkflow = () => {
    if (currentWorkflow) {
      setWorkflowData({ mode: 'existing', workflowId: currentWorkflow.workflow_id })
      setShowAudienceWarning(false)
      setShowPublishConfirm(true)
    }
  }

  const handleChangeWorkflow = () => {
    setShowAudienceWarning(false)
    setShowWorkflowDialog(true)
  }

  const handleWorkflowConfirm = (workflow: any) => {
    setWorkflowData(workflow)
    setShowWorkflowDialog(false)
    // Now show audience selection
    setShowPublishConfirm(true)
  }

  const confirmPublish = async () => {
    setIsSaving(true)
    try {
      // أولاً: احفظ النموذج إذا لم يُحفظ بعد
      let formIdToPublish = savedFormId

      if (!formIdToPublish) {
        const saveResult = await saveFormTemplate({
          form_id: savedFormId || undefined,
          name: formName,
          schema: fields,
          requesterId: currentUserId,
        pdf_template: pdfTemplate
        })

        if (!saveResult.success || !saveResult.data) {
          toast({
            title: "فشل الحفظ",
            description: saveResult.error || "لا يمكن حفظ النموذج قبل النشر",
            variant: "destructive",
            duration: 3000,
          })
          setIsSaving(false)
          return
        }

        formIdToPublish = saveResult.data.form_id
        setSavedFormId(formIdToPublish)
      }

      // ثانياً: انشر النموذج مع معلومات الجمهور ومسار العمل
      const audienceConfig: any = {}
      if (targetAudience === 'student') {
        audienceConfig.student = true
        audienceConfig.employee = false
      } else if (targetAudience === 'employee') {
        audienceConfig.student = false
        audienceConfig.employee = true
      } else if (targetAudience === 'specific') {
        audienceConfig.student = specificRoleConfig.student
        audienceConfig.employee = specificRoleConfig.employee
        if (selectedColleges.length > 0) {
          audienceConfig.colleges = selectedColleges
        }
        if (selectedDepartments.length > 0) {
          audienceConfig.departments = selectedDepartments
        }
      } else {
        audienceConfig.student = true
        audienceConfig.employee = true
      }

      const publishResult = await publishFormTemplate(
        formIdToPublish,
        audienceConfig,
        workflowData,
        currentUserId
      )

      if (publishResult.success) {
        const audienceLabel = targetAudience === 'student' ? 'للطلاب' : targetAudience === 'employee' ? 'للموظفين' : 'للجميع'
        toast({
          title: "تم النشر بنجاح",
          description: `تم نشر النموذج "${formName}" بنجاح ${audienceLabel}`,
          duration: 3000,
          className: "bg-primary text-white border-primary",
        })
        setShowPublishConfirm(false)
        setWorkflowData(null)
        // العودة لقائمة النماذج
        setTimeout(() => onBack(), 500)
      } else {
        toast({
          title: "فشل النشر",
          description: publishResult.error || "حدث خطأ أثناء النشر",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("Publish error:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background" dir="rtl">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جارٍ تحميل النموذج...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="border-b bg-card p-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <Button onClick={handlePublish} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white gap-2">
                  <UploadIcon className="w-4 h-4" />
                  {isSaving ? "جارٍ النشر..." : "نشر"}
                </Button>
                <Button onClick={handleSave} disabled={isSaving} variant="outline" className="gap-2 bg-transparent">
                  <Save className="w-4 h-4" />
                  {isSaving ? "جارٍ الحفظ..." : "حفظ"}
                </Button>

              </div>

              {/* Form Name - Center */}
              <div className="flex-1 max-w-md flex flex-col gap-1.5">
                <Label className="text-center" required>اسم النموذج</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="text-center font-semibold"
                  placeholder={isNewForm ? "اسم النموذج الجديد" : "اسم النموذج"}
                />
              </div>

              {/* Back Button */}
              <Button variant="ghost" onClick={onBack} className="gap-2">
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
            </div>
          </div>

          {/* Main Content - Tabs Layout */}
          <Tabs defaultValue="form" className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-card border-b px-4">
              <TabsList>
                <TabsTrigger value="form">تصميم النموذج</TabsTrigger>
                <TabsTrigger value="template">قالب الوثيقة الرسمية</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="form" className="flex-1 flex flex-col p-0 m-0 data-[state=inactive]:hidden">
              <div className="p-2 border-b bg-muted/20 flex justify-end">
                  <Button onClick={() => setShowPreview(true)} variant="outline" size="sm" className="gap-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-200">
                    <Eye className="w-4 h-4" />
                    معاينة النموذج
                  </Button>
              </div>
              <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* RIGHT COLUMN - Field Settings Panel (Now on Left/Start in LTR-rendered RTL) */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                  <div className="h-full overflow-y-auto border-l p-4">
                    {selectedField ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-semibold" required>تسمية الحقل</Label>
                          <Input
                            value={selectedField.label}
                            onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-semibold" required>مفتاح الحقل (الاسم الداخلي)</Label>
                          <Input
                            value={selectedField.key}
                            onChange={(e) => updateField(selectedField.id, { key: e.target.value })}
                            className="mt-1"
                            placeholder="field_name"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-semibold" required>نوع الحقل</Label>
                          <select
                            value={selectedField.type}
                            onChange={(e) =>
                              updateField(selectedField.id, {
                                type: e.target.value as FormField["type"],
                              })
                            }
                            className="w-full p-2 border border-border rounded-lg mt-1 text-sm bg-background text-foreground"
                          >
                            {fieldTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="required"
                            checked={selectedField.required}
                            onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                            className="rounded"
                          />
                          <Label htmlFor="required" className="text-sm font-semibold cursor-pointer">
                            حقل مطلوب
                          </Label>
                        </div>

                        {selectedField.type !== "section" && (
                          <div>
                            <Label className="text-sm font-semibold">نص التلميح</Label>
                            <Input
                              value={selectedField.placeholder || ""}
                              onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                              className="mt-1"
                              placeholder="أدخل نص التلميح"
                            />
                          </div>
                        )}

                        {["select", "radio", "checkbox"].includes(selectedField.type) && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label className="text-sm font-semibold">الخيارات</Label>
                            <div className="space-y-2">
                              {selectedField.options?.map((option) => (
                                <div key={option.id} className="flex gap-2 items-center">
                                  <Input
                                    value={option.label}
                                    onChange={(e) => updateOption(selectedField.id, option.id, e.target.value)}
                                    className="text-sm"
                                    placeholder="تسمية الخيار"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteOption(selectedField.id, option.id)}
                                    className="text-destructive hover:bg-destructive/10"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(selectedField.id)}
                                className="w-full gap-1 text-sm"
                              >
                                <Plus className="w-3 h-3" />
                                إضافة خيار
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Info Note */}
                        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 text-right">
                          <p className="font-semibold mb-1">معلومة</p>
                          <p>هذه الإعدادات تتحكم في كيفية ظهور هذا الحقل في نماذج الطلبات الخاصة بالطلاب والموظفين.</p>
                        </div>

                        {/* Field Actions */}
                        <div className="space-y-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateField(selectedField.id)}
                            className="w-full gap-2 text-sm"
                          >
                            <Copy className="w-4 h-4" />
                            نسخ الحقل
                          </Button>
                          <div className="flex gap-2">
                            {/* Drag and Drop enabled - Buttons removed */}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteField(selectedField.id)}
                            className="w-full gap-2 text-destructive hover:bg-destructive/10 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف الحقل
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">حدد حقلاً لتحرير خصائصه</p>
                      </div>
                    )}
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* MIDDLE COLUMN - Form Canvas */}
                <ResizablePanel defaultSize={40} minSize={25}>
                  <div className="h-full overflow-y-auto p-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-foreground mb-4">حقول النموذج ({fields.length})</h3>
                      {fields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground text-sm">اسحب أنواع الحقول من اليسار لإنشاء نموذجك</p>
                        </div>
                      ) : (
                        fields.map((field) => {
                          const fieldType = fieldTypes.find((t) => t.id === field.type)
                          const Icon = fieldType?.icon
                          return (
                            <div
                              key={field.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, field.id)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, field.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => setSelectedFieldId(field.id)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedFieldId === field.id
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border hover:border-primary/50 bg-card"
                                } ${draggedFieldId === field.id ? "opacity-50 dashed border-primary" : ""}`}
                            >
                              <div className="flex items-start gap-2">
                                <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                                <div className="flex-1 min-w-0 text-right">
                                  <p className="font-medium text-sm text-foreground truncate">{field.label}</p>
                                  <div className="flex items-center gap-2 mt-1 justify-end">
                                    {field.required && <Badge className="bg-red-100 text-red-800 text-xs">مطلوب</Badge>}
                                    <Badge variant="outline" className="text-xs">
                                      {fieldType?.label}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* LEFT COLUMN - Field Toolbox (Now on Right/End in LTR-rendered RTL) */}
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                  <div className="h-full overflow-y-auto border-r p-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-foreground mb-4">أنواع الحقول</h3>
                      {fieldTypes.map((type) => {
                        const Icon = type.icon
                        return (
                          <button
                            key={type.id}
                            onClick={() => addField(type.id)}
                            className={`w-full p-3 rounded-lg border-2 border-transparent hover:border-primary transition-all ${type.color}`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              <div className="text-right">
                                <div className="text-sm font-medium">{type.label}</div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </ResizablePanel>

              </ResizablePanelGroup>
          </TabsContent>

          {/* Preview Dialog */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>معاينة النموذج: {formName}</DialogTitle>
                <DialogDescription>هذه معاينة لكيفية ظهور النموذج للمستخدمين</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {fields.map((field) => {
                  const fieldType = fieldTypes.find((t) => t.id === field.type)
                  return (
                    <div key={field.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="font-medium text-foreground flex items-center gap-1">
                          {field.label}
                          {field.required && <span className="text-red-500 font-bold">*</span>}
                        </label>
                      </div>

                      {field.type === "text" && (
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          disabled
                          className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                        />
                      )}
                      {field.type === "longtext" && (
                        <textarea
                          placeholder={field.placeholder}
                          disabled
                          rows={4}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                        />
                      )}
                      {field.type === "number" && (
                        <input
                          type="number"
                          placeholder={field.placeholder}
                          disabled
                          className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                        />
                      )}
                      {field.type === "date" && (
                        <input
                          type="date"
                          disabled
                          className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                        />
                      )}
                      {field.type === "file" && (
                        <input
                          type="file"
                          disabled
                          className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                        />
                      )}
                      {field.type === "section" && (
                        <div className="text-sm font-semibold text-foreground mt-2">{field.label}</div>
                      )}
                      {["select", "radio", "checkbox"].includes(field.type) && (
                        <div className="space-y-2">
                          {field.options?.map((option) =>
                            field.type === "select" ? (
                              <div key={option.id}>{option.label}</div>
                            ) : (
                              <div key={option.id} className="flex items-center gap-2">
                                {field.type === "radio" ? (
                                  <input type="radio" disabled className="w-4 h-4" />
                                ) : (
                                  <input type="checkbox" disabled className="w-4 h-4" />
                                )}
                                <label className="text-sm text-foreground">{option.label}</label>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Publish Confirmation Dialog */}
          <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
            <DialogContent dir="rtl" className="sm:max-w-md gap-0 p-0 overflow-hidden">
              <DialogHeader className="p-4 border-b">
                <DialogTitle>تأكيد نشر النموذج</DialogTitle>
                <DialogDescription>
                  مراجعة نهائية قبل إتاحة النموذج للمستخدمين.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="bg-blue-50 border border-blue-100 rounded-md p-3 flex items-start gap-3">
                  <div className="p-1.5 bg-blue-100 rounded-full text-blue-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-blue-900">{formName}</p>
                    <p className="text-xs text-blue-700">
                      يحتوي على {fields.length} حقول • {targetAudience === 'student' ? 'متاح للطلاب' : targetAudience === 'employee' ? 'متاح للموظفين' : 'متاح للجميع'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">الجمهور المستهدف</Label>
                    <Select
                      value={targetAudience}
                      onValueChange={(val: any) => setTargetAudience(val)}
                      dir="rtl"
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر الجمهور" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="student">جميع الطلاب</SelectItem>
                        <SelectItem value="employee">جميع الموظفين</SelectItem>
                        <SelectItem value="both">الجميع (طلاب وموظفين)</SelectItem>
                        <SelectItem value="specific">محدد (كليات/أقسام)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>


                  {targetAudience === 'specific' && (
                    <div className="space-y-3 pt-2 border-t mt-2">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 flex-1 hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={specificRoleConfig.student}
                            onChange={(e) => setSpecificRoleConfig({ ...specificRoleConfig, student: e.target.checked })}
                            className="w-4 h-4 rounded text-primary accent-primary"
                          />
                          <span className="text-sm">الطلاب</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 flex-1 hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={specificRoleConfig.employee}
                            onChange={(e) => setSpecificRoleConfig({ ...specificRoleConfig, employee: e.target.checked })}
                            className="w-4 h-4 rounded text-primary accent-primary"
                          />
                          <span className="text-sm">الموظفين</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">الكليات</Label>
                          <div className="h-[120px] overflow-y-auto border rounded-md bg-white p-2">
                            {colleges.length === 0 ? (
                              <p className="text-xs text-muted-foreground">لا توجد كليات</p>
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
                                        setSelectedColleges(selectedColleges.filter((id: number) => id !== college.college_id))
                                      }
                                    }}
                                    className="w-3.5 h-3.5 accent-primary rounded"
                                  />
                                  <span className="text-xs truncate" title={college.name}>{college.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">الأقسام</Label>
                          <div className="h-[120px] overflow-y-auto border rounded-md bg-white p-2">
                            {selectedColleges.length === 0 ? (
                              <p className="text-xs text-muted-foreground">اختر كلية</p>
                            ) : departments.filter((d: any) => selectedColleges.includes(d.college_id)).length === 0 ? (
                              <p className="text-xs text-muted-foreground">لا توجد أقسام</p>
                            ) : (
                              departments
                                .filter((dept: any) => selectedColleges.includes(dept.college_id))
                                .map((dept: any) => (
                                  <label key={dept.department_id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={selectedDepartments.includes(dept.department_id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedDepartments([...selectedDepartments, dept.department_id])
                                        } else {
                                          setSelectedDepartments(selectedDepartments.filter((id: any) => id !== dept.department_id))
                                        }
                                      }}
                                      className="w-3.5 h-3.5 accent-primary rounded"
                                    />
                                    <span className="text-xs truncate" title={dept.dept_name}>{dept.dept_name}</span>
                                  </label>
                                ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="p-4 border-t bg-gray-50 gap-2 sm:gap-0">
                <Button variant="outline" size="sm" onClick={() => setShowPublishConfirm(false)}>
                  إلغاء
                </Button>
                <Button size="sm" onClick={confirmPublish} className="bg-primary hover:bg-primary/90">
                  تأكيد النشر
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Audience Change Warning Dialog */}
          <Dialog open={showAudienceWarning} onOpenChange={setShowAudienceWarning}>
            <DialogContent dir="rtl" className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">تنبيه: تغيير الجمهور المستهدف</DialogTitle>
                <DialogDescription className="pt-2 text-base">
                  لقد قمت بتغيير الجمهور المستهدف لهذا النموذج. هل تريد الاستمرار في استخدام مسار العمل الحالي أم تغييره؟
                </DialogDescription>
              </DialogHeader>

              {currentWorkflow && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                  <p className="text-sm font-semibold text-gray-700 mb-1">المسار الحالي:</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white">{currentWorkflow.name}</Badge>
                    {/* @ts-ignore */}
                    <span className="text-xs text-muted-foreground">({currentWorkflow.workflow_steps?.length || 0} خطوات)</span>
                  </div>
                </div>
              )}

              <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
                <Button variant="outline" onClick={handleChangeWorkflow} className="flex-1">
                  تغيير المسار
                </Button>
                <Button onClick={handleKeepWorkflow} className="flex-1 bg-primary hover:bg-primary/90">
                  إبقاء المسار الحالي
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Workflow Selection Dialog */}
          <WorkflowSelectionDialog
            open={showWorkflowDialog}
            onOpenChange={setShowWorkflowDialog}
            onConfirm={handleWorkflowConfirm}
          />

            <TabsContent value="template" className="flex-1 overflow-hidden p-0 data-[state=inactive]:hidden">
              <div className="h-full p-6">
                <PdfTemplateEditor 
                  template={pdfTemplate || undefined}
                  onTemplateChange={setPdfTemplate}
                  signatureUrl={signatureUrl}
                  stampUrl={stampUrl}
                  onSignatureChange={setSignatureUrl}
                  onStampChange={setStampUrl}
                />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
