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
import { getAllDepartments, createDepartment, updateDepartment, deleteDepartment } from "@/app/actions/organizations"
import { getAllColleges } from "@/app/actions/organizations"
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

interface AdminDepartmentsPageProps {
    onBack: () => void
}

export default function AdminDepartmentsPage({ onBack }: AdminDepartmentsPageProps) {
    const [departments, setDepartments] = useState<any[]>([])
    const [colleges, setColleges] = useState<any[]>([])
    const [managers, setManagers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [selectedCollege, setSelectedCollege] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<number | null>(null)
    const { toast } = useToast()

    const [formData, setFormData] = useState({
        dept_name: "",
        college_id: null as number | null,
        manager_id: null as number | null
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        try {
            const [deptsResult, collegesResult, usersResult] = await Promise.all([
                getAllDepartments(),
                getAllColleges(),
                getUsers()
            ])

            if (deptsResult.success && deptsResult.data) {
                setDepartments(deptsResult.data)
            } else {
                setError(deptsResult.error || "فشل في تحميل الأقسام")
            }

            if (collegesResult.success && collegesResult.data) {
                setColleges(collegesResult.data)
            }

            if (usersResult.success && usersResult.data) {
                // Filter eligible users (employees and admins can be managers)
                const eligibleUsers = usersResult.data.filter((u: any) =>
                    u.roles?.role_name === 'manager' ||
                    u.roles?.role_name === 'dean' ||
                    u.roles?.role_name === 'employee' ||
                    u.roles?.role_name === 'admin'
                )
                setManagers(eligibleUsers)
            }
        } catch (err) {
            console.error("Failed to fetch data:", err)
            setError("حدث خطأ في الاتصال بقاعدة البيانات")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!formData.dept_name) {
            toast({ title: "❌ خطأ", description: "يرجى إدخال اسم القسم", variant: "destructive" })
            return
        }

        try {
            // If college_id is null, we can pass it as undefined or null depending on what the action expects.
            // Assuming the action handles optional numbers correctly.
            const collegeIdValue = formData.college_id ? formData.college_id : undefined

            const result = editingId
                ? await updateDepartment(editingId, { ...formData, college_id: collegeIdValue })
                : await createDepartment({ ...formData, college_id: collegeIdValue || null, manager_id: formData.manager_id || null })

            if (result.success) {
                toast({ title: `✅ تم ${editingId ? 'التحديث' : 'الإضافة'} بنجاح` })
                setFormData({ dept_name: "", college_id: null, manager_id: null })
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

    const handleEdit = (dept: any) => {
        setEditingId(dept.department_id)
        setFormData({
            dept_name: dept.dept_name,
            college_id: dept.college_id,
            manager_id: dept.manager_id
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
            const result = await deleteDepartment(itemToDelete)

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
        setFormData({ dept_name: "", college_id: null, manager_id: null })
        setShowAddForm(false)
        setEditingId(null)
    }

    // Filter logic update
    const filteredDepartments = selectedCollege
        ? (selectedCollege === 'none'
            ? departments.filter((d: any) => !d.college_id) // Departments with no college
            : departments.filter((d: any) => d.college_id === parseInt(selectedCollege)))
        : departments

    if (loading) {
        return (
            <div className="space-y-6 p-6" dir="rtl">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">إدارة الأقسام</h1>
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
                    <h1 className="text-3xl font-bold">إدارة الأقسام</h1>
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
                    <h1 className="text-3xl font-bold">إدارة الأقسام</h1>
                    <p className="text-sm text-muted-foreground mt-1">{departments.length} قسم في النظام</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowAddForm(true)} className="bg-primary gap-2">
                        <Plus className="w-4 h-4" />
                        قسم جديد
                    </Button>
                    <Button onClick={onBack} variant="ghost" className="gap-2">
                        <ArrowRight className="w-4 h-4" />
                        رجوع
                    </Button>
                </div>
            </div>

            {/* Filter */}
            <Card>
                <CardContent className="pt-6">
                    <select
                        value={selectedCollege}
                        onChange={(e) => setSelectedCollege(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                    >
                        <option value="">جميع الكليات</option>
                        <option value="none">أقسام عامة (بدون كلية)</option>
                        {colleges.map((college: any) => (
                            <option key={college.college_id} value={college.college_id}>{college.name}</option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {/* Add/Edit Form */}
            {showAddForm && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle>{editingId ? 'تعديل قسم' : 'إضافة قسم جديد'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium" required>اسم القسم</Label>
                            <Input
                                placeholder="مثال: قسم علوم الحاسب"
                                value={formData.dept_name}
                                onChange={(e) => setFormData({ ...formData, dept_name: e.target.value })}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">الكلية (اختياري)</Label>
                            <select
                                value={formData.college_id || ""}
                                onChange={(e) => setFormData({ ...formData, college_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full mt-1 px-3 py-2 border rounded-lg"
                            >
                                <option value="">بدون كلية (قسم عام)</option>
                                {colleges.map((college: any) => (
                                    <option key={college.college_id} value={college.college_id}>{college.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">رئيس القسم (اختياري)</Label>
                            <select
                                value={formData.manager_id || ""}
                                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full mt-1 px-3 py-2 border rounded-lg"
                            >
                                <option value="">بدون رئيس قسم</option>
                                {managers.map((manager: any) => (
                                    <option key={manager.user_id} value={manager.user_id}>
                                        {manager.full_name} ({manager.roles?.role_name || 'غير محدد'})
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

            {/* Departments List */}
            {filteredDepartments.length === 0 ? (
                <EmptyState
                    icon="📚"
                    title="لا توجد أقسام"
                    description="لا توجد أقسام في النظام. قم بإضافة قسم جديد."
                    action={{
                        label: "إضافة قسم",
                        onClick: () => setShowAddForm(true)
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDepartments.map((dept: any) => (
                        <Card key={dept.department_id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{dept.dept_name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            {colleges.find((c: any) => c.college_id === dept.college_id)?.name || "غير محدد"}
                                        </CardDescription>
                                        <CardDescription className="mt-1">
                                            رئيس القسم: {dept.users_departments_manager_idTousers?.full_name || "غير محدد"}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(dept)}
                                            className="text-primary"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(dept.department_id)}
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
                        <AlertDialogTitle>هل أنت متأكد من حذف هذا القسم؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            لا يمكن التراجع عن هذا الإجراء. سيتم حذف القسم.
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
