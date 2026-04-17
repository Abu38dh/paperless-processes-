"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Send, UserCheck, Upload } from "lucide-react"

interface RequestSubmissionFormProps {
  requestType: string
  requestTypes: Array<{ id: string; label: string; icon: string }>
  userId: string
  onBack: () => void
  onSubmit: (data: any) => void
  initialData?: any
  requestId?: string
  isEditing?: boolean
}

import { submitRequest, updateRequest } from "@/app/actions/student"
import { getFormTemplate } from "@/app/actions/forms"
import { getMyAbsences } from "@/app/actions/absences"

export default function RequestSubmissionForm({
  requestType, // This is the formId
  requestTypes = [],
  userId,
  onBack,
  onSubmit,
  initialData,
  requestId,
  isEditing = false,
}: RequestSubmissionFormProps) {
  const [formData, setFormData] = useState<any>({})
  const [formSchema, setFormSchema] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [studentSubjects, setStudentSubjects] = useState<any[]>([])
  const [fetchingSubjects, setFetchingSubjects] = useState(false)

  useEffect(() => {
    const fetchFormSchema = async () => {
      setIsLoading(true)
      try {
        const result = await getFormTemplate(parseInt(requestType))
        if (result.success && result.data) {
          setFormSchema(result.data.schema as any[])
          setFormName(result.data.name)

          // Pre-fill data if editing
          if (isEditing && initialData) {
            setFormData(initialData)
          }

          // Check if form has absence_picker and fetch subjects
          const schemaArray = Array.isArray(result.data.schema) ? result.data.schema : (typeof result.data.schema === 'string' ? JSON.parse(result.data.schema) : []);
          const hasAbsencePicker = schemaArray.some((f: any) => f.type === 'absence_picker')
          if (hasAbsencePicker) {
            setFetchingSubjects(true)
            const absResult = await getMyAbsences(userId)
            if (absResult.success) {
              setStudentSubjects(absResult.subjects || [])
            }
            setFetchingSubjects(false)
          }

        } else {
          setError("فشل في تحميل نموذج الطلب")
        }
      } catch (err) {
        setError("حدث خطأ أثناء تحميل النموذج")
      } finally {
        setIsLoading(false)
      }
    }

    if (requestType) {
      fetchFormSchema()
    }
  }, [requestType])

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate required fields
      const missingFields = formSchema
        .filter(field => field.required && !formData[field.key])
        .map(field => field.label)

      if (missingFields.length > 0) {
        setError(`يرجى تعبئة الحقول المطلوبة: ${missingFields.join(", ")}`)
        setIsSubmitting(false)
        return
      }

      let result

      const payload = {
        formId: requestType,
        userId: userId,
        ...formData
      }

      if (isEditing && requestId) {
        result = await updateRequest(parseInt(requestId), formData, userId)
      } else {
        result = await submitRequest(payload)
      }

      if (result.success) {
        onSubmit(formData)
      } else {
        setError(result.error || (isEditing ? "فشل تحديث الطلب" : "فشل تقديم الطلب"))
      }
    } catch (err) {
      setError("حدث خطأ غير متوقع")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-foreground">{formName}</h2>
        <Button onClick={onBack} variant="ghost" size="sm" className="gap-2">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-6">
          <CardTitle className="text-xl">{isEditing ? "تعديل الطلب" : "تقديم طلب جديد"}</CardTitle>
          <CardDescription className="text-base mt-2">
            {isEditing
              ? "يمكنك تعديل البيانات وإعادة إرسال الطلب للمراجعة"
              : "الرجاء ملء جميع البيانات المطلوبة أدناه بدقة"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-8">

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {formSchema.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد حقول في هذا النموذج
              </div>
            ) : (
              formSchema.map((field) => (
                <div key={field.id} className="space-y-3">
                  {field.type === "section" && (
                    <div className="bg-muted/40 -mx-6 px-6 py-4 mb-6 mt-8 first:mt-0">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <span className="text-primary">▪</span>
                        {field.label}
                      </h3>
                    </div>
                  )}

                  {field.type !== 'section' && (
                    <>
                      <Label className="block text-base font-semibold text-foreground mb-2" required={field.required}>
                        {field.label}
                      </Label>

                      {field.type === "text" && (
                        <Input
                          type="text"
                          placeholder={field.placeholder}
                          value={formData[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          required={field.required}
                          className="text-right h-11 text-base"
                        />
                      )}

                      {field.type === "longtext" && (
                        <textarea
                          placeholder={field.placeholder}
                          value={formData[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          required={field.required}
                          className="w-full px-4 py-3 border border-input rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[120px] text-base bg-background resize-y"
                          rows={4}
                        />
                      )}

                      {field.type === "number" && (
                        <Input
                          type="number"
                          placeholder={field.placeholder}
                          value={formData[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          required={field.required}
                          className="text-right h-11 text-base"
                        />
                      )}

                      {field.type === "date" && (
                        <Input
                          type="date"
                          value={formData[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          required={field.required}
                          className="text-right h-11 text-base"
                        />
                      )}

                      {field.type === "select" && (
                        <select
                          value={formData[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          className="w-full h-11 px-4 py-2 border border-input rounded-lg bg-background text-foreground text-right text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                          required={field.required}
                        >
                          <option value="">اختر...</option>
                          {field.options?.map((opt: any) => (
                            <option key={opt.id} value={opt.label}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === "radio" && (
                        <div className="space-y-3 pr-2">
                          {field.options?.map((opt: any) => (
                            <div key={opt.id} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name={field.key}
                                id={`${field.key}-${opt.id}`}
                                value={opt.label}
                                checked={formData[field.key] === opt.label}
                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                className="w-4 h-4 text-primary cursor-pointer"
                              />
                              <Label htmlFor={`${field.key}-${opt.id}`} className="text-base cursor-pointer select-none">
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {field.type === "checkbox" && (
                        <div className="space-y-3 pr-2">
                          {field.options?.map((opt: any) => (
                            <div key={opt.id} className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id={`${field.key}-${opt.id}`}
                                value={opt.label}
                                checked={Array.isArray(formData[field.key]) && formData[field.key].includes(opt.label)}
                                onChange={(e) => {
                                  const currentValues = Array.isArray(formData[field.key]) ? formData[field.key] : []
                                  let newValues
                                  if (e.target.checked) {
                                    newValues = [...currentValues, opt.label]
                                  } else {
                                    newValues = currentValues.filter((v: string) => v !== opt.label)
                                  }
                                  handleInputChange(field.key, newValues)
                                }}
                                className="w-4 h-4 text-primary rounded cursor-pointer"
                              />
                              <Label htmlFor={`${field.key}-${opt.id}`} className="text-base cursor-pointer select-none">
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {field.type === "file" && (
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/30 hover:border-primary/50 transition-all cursor-pointer relative">
                          <Input
                            type="file"
                            className="hidden"
                            id={`file-${field.id}`}
                            onChange={async (e) => {
                              if (e.target.files?.[0]) {
                                const file = e.target.files[0]
                                const formData = new FormData()
                                formData.append('file', file)

                                try {
                                  // Show uploading state (could aid with a local state if needed for UI feedback)
                                  const loadingToast = document.createElement('div')
                                  loadingToast.className = "fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded shadow-lg z-50"
                                  loadingToast.innerText = "جاري رفع الملف..."
                                  document.body.appendChild(loadingToast)

                                  const response = await fetch('/api/upload', {
                                    method: 'POST',
                                    body: formData
                                  })

                                  document.body.removeChild(loadingToast)

                                  const data = await response.json()

                                  if (data.success) {
                                    handleInputChange(field.key, data.url)
                                  } else {
                                    alert("فشل رفع الملف: " + data.error)
                                  }
                                } catch (err) {
                                  console.error("Upload failed", err)
                                  alert("حدث خطأ أثناء رفع الملف")
                                }
                              }
                            }}
                          />
                          <Label htmlFor={`file-${field.id}`} className="cursor-pointer flex flex-col items-center gap-3">
                            <Upload className="w-10 h-10 text-muted-foreground" />
                            <div className="space-y-1">
                              <p className="text-base font-medium text-foreground">
                                {formData[field.key] ? (
                                  <span className="text-primary font-bold">تم رفع الملف بنجاح ✅</span>
                                ) : "اضغط لرفع ملف"}
                              </p>
                              {!formData[field.key] && (
                                <p className="text-sm text-muted-foreground">أو اسحب الملف وأفلته هنا</p>
                              )}
                              {formData[field.key] && (
                                <p className="text-xs text-muted-foreground break-all max-w-xs mx-auto mt-2">
                                  {/* Show filename or view link if possible */}
                                  <a href={formData[field.key]} target="_blank" rel="noopener noreferrer" className="hover:underline">عرض الملف المرفق</a>
                                </p>
                              )}
                            </div>
                          </Label>
                        </div>
                      )}
                      {field.type === "absence_picker" && (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-5 space-y-4">
                          {fetchingSubjects ? (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block"></span>
                              جاري جلب المواد المسجلة...
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold">المادة (التي فيها الغياب)</Label>
                                <select
                                  value={formData[field.key]?.subjectId || ""}
                                  onChange={(e) => {
                                    const selectedId = parseInt(e.target.value);
                                    const subjectName = studentSubjects.find((s: any) => s.subject_id === selectedId)?.name || "";
                                    handleInputChange(field.key, { ...formData[field.key], subjectId: selectedId, subjectName });
                                  }}
                                  className="w-full h-11 px-4 py-2 border border-input rounded-lg bg-background text-foreground text-right text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                                  required={field.required}
                                >
                                  <option value="">اختر المادة...</option>
                                  {studentSubjects.map((s: any) => (
                                    <option key={s.subject_id} value={s.subject_id}>
                                      {s.name} {s.code ? `(${s.code})` : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold">تاريخ الغياب</Label>
                                <Input
                                  type="date"
                                  value={formData[field.key]?.date || ""}
                                  onChange={(e) => handleInputChange(field.key, { ...formData[field.key], date: e.target.value })}
                                  required={field.required}
                                  className="text-right h-11 text-base"
                                />
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-emerald-700 font-medium">✨ النظام سيقوم بمعالجة غيابك آلياً عند قبول هذا الطلب</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}

            <div className="flex gap-4 justify-end pt-6 border-t mt-8">
              <Button onClick={onBack} variant="outline" type="button" size="lg" className="px-8">
                إلغاء
              </Button>
              <Button
                type="submit"
                size="lg"
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جارٍ التقديم...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {isEditing ? "تحديث الطلب" : "تقديم الطلب"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
