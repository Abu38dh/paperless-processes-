"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit2, Trash2, ArrowRight, Save, X } from "lucide-react"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { ErrorMessage } from "@/components/ui/error-message"
import { EmptyState } from "@/components/ui/empty-state"
import { getAllColleges, createCollege, updateCollege, deleteCollege } from "@/app/actions/organizations"
import { getUsers } from "@/app/actions/admin"
import { useToast } from "@/hooks/use-toast"
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

interface AdminCollegesPageProps {
    onBack: () => void
}

export default function AdminCollegesPage({ onBack }: AdminCollegesPageProps) {
    const [colleges, setColleges] = useState<any[]>([])
    const [deans, setDeans] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<number | null>(null)
    const { toast } = useToast()

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        dean_id: null as number | null
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setError(null)

        try {
            const [collegesResult, usersResult] = await Promise.all([
                getAllColleges(),
                getUsers()
            ])

            if (collegesResult.success && collegesResult.data) {
                setColleges(collegesResult.data)
            } else {
                setError(collegesResult.error || "فشل في تحميل الكليات")
            }

            if (usersResult.success && usersResult.data) {
                // Filter eligible users (employees and admins can be deans)
                const eligibleUsers = usersResult.data.filter((u: any) =>
                    u.roles?.role_name === 'dean' ||
                    u.roles?.role_name === 'employee' ||
                    u.roles?.role_name === 'admin'
                )
                setDeans(eligibleUsers)
            }
        } catch (err) {
            console.error("Failed to fetch data:", err)
            setError("حدث خطأ في الاتصال بقاعدة البيانات")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!formData.name) {
            toast({ title: "❌ خطأ", description: "يرجى إدخال اسم الكلية", variant: "destructive" })
            return
        }

        try {
            const result = editingId
                ? await updateCollege(editingId, {
                    name: formData.name,
                    dean_id: formData.dean_id === null ? undefined : formData.dean_id
                })
                : await createCollege({
                    name: formData.name,
                    dean_id: formData.dean_id === null ? undefined : formData.dean_id
                })

            if (result.success) {
                toast({ title: `✅ تم ${editingId ? 'التحديث' : 'الإضافة'} بنجاح` })
                setFormData({ name: "", dean_id: null })
                setShowAddForm(false)
                setEditingId(null)
                await fetchData()
            } else {
                toast({ title: "❌ فشلت العملية", description: result.error, variant: "destructive" })
            }
        } catch (err) {
            toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
        }
    }

    const handleEdit = (college: any) => {
        setEditingId(college.college_id)
        setFormData({
            name: college.name,
            dean_id: college.dean_id
        })
        setShowAddForm(true)
    }

    const handleDelete = (id: number) => {
        setItemToDelete(id)
        setDeleteDialogOpen(true)
    }

    const executeDelete = async () => {
        if (!itemToDelete) return

        try {
            const result = await deleteCollege(itemToDelete)

            if (result.success) {
                toast({ title: "✅ تم الحذف بنجاح" })
                await fetchData()
                setDeleteDialogOpen(false)
                setItemToDelete(null)
            } else {
                toast({ title: "❌ فشل الحذف", description: result.error, variant: "destructive" })
            }
        } catch (err) {
            toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
        }
    }

    const cancelForm = () => {
        setFormData({ name: "", dean_id: null })
        setShowAddForm(false)
        setEditingId(null)
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6" dir="rtl">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">إدارة الكليات</h1>
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
                    <h1 className="text-3xl font-bold">إدارة الكليات</h1>
                    <Button onClick={onBack} variant="ghost">رجوع</Button>
                </div>
                <ErrorMessage error={error} onRetry={fetchData} />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">إدارة الكليات</h1>
                    <p className="text-sm text-muted-foreground mt-1">{colleges.length} كلية في النظام</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowAddForm(true)} className="bg-primary gap-2">
                        <Plus className="w-4 h-4" />
                        كلية جديدة
                    </Button>
                    <Button onClick={onBack} variant="ghost" className="gap-2">
                        <ArrowRight className="w-4 h-4" />
                        رجوع
                    </Button>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle>{editingId ? 'تعديل كلية' : 'إضافة كلية جديدة'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium" required>اسم الكلية</Label>
                            <Input
                                placeholder="مثال: كلية الهندسة"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">العميد (اختياري)</Label>
                            <select
                                value={formData.dean_id || ""}
                                onChange={(e) => setFormData({ ...formData, dean_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full mt-1 px-3 py-2 border rounded-lg"
                            >
                                <option value="">بدون عميد</option>
                                {deans.map((dean: any) => (
                                    <option key={dean.user_id} value={dean.user_id}>
                                        {dean.full_name} ({dean.roles?.role_name || 'غير محدد'})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={cancelForm}>
                                <X className="w-4 h-4 mr-2" />
                                إلغاء
                            </Button>
                            <Button onClick={handleSubmit}>
                                <Save className="w-4 h-4 mr-2" />
                                {editingId ? 'تحديث' : 'إضافة'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Colleges List */}
            {colleges.length === 0 ? (
                <EmptyState
                    icon="🏫"
                    title="لا توجد كليات"
                    description="لا توجد كليات في النظام. قم بإضافة كلية جديدة."
                    action={{
                        label: "إضافة كلية",
                        onClick: () => setShowAddForm(true)
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {colleges.map((college: any) => (
                        <Card key={college.college_id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{college.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            العميد: {college.users?.full_name || "غير محدد"}
                                        </CardDescription>
                                        <CardDescription className="mt-1">
                                            {college.departments?.length || 0} قسم
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(college)}
                                            className="text-primary"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(college.college_id)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد من حذف هذه الكلية؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            لا يمكن التراجع عن هذا الإجراء. سيتم حذف الكلية وجميع الأقسام التابعة لها.
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
