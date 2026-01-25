"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Trash2, Search, UserCheck, UserX, ArrowRight, ChevronDown, ChevronUp, Save, X, Shield, CheckCircle, XCircle, FileText, Building2, BarChart3, Workflow } from "lucide-react"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { ErrorMessage } from "@/components/ui/error-message"
import { getUsers, createUser, updateUser, deleteUser, getAllRoles } from "@/app/actions/admin"
import { getAllColleges } from "@/app/actions/organizations"
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

interface AdminUserPageProps {
  onBack: () => void
}

export default function AdminUsersPage({ onBack }: AdminUserPageProps) {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [colleges, setColleges] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Filter States
  const [selectedCollegeId, setSelectedCollegeId] = useState("")
  const [selectedDeptId, setSelectedDeptId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const [showAddUser, setShowAddUser] = useState(false)
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [expandedUserData, setExpandedUserData] = useState<any>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)

  // New user form
  const [newUserName, setNewUserName] = useState("")
  const [newUserUniversityId, setNewUserUniversityId] = useState("")
  const [newUserPhone, setNewUserPhone] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserRoleId, setNewUserRoleId] = useState<number>(3) // default student
  const [newUserDeptId, setNewUserDeptId] = useState("")
  const [newUserCollegeId, setNewUserCollegeId] = useState("") // للموظفين

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setError(null)

    try {
      const [usersResult, rolesResult, collegesResult] = await Promise.all([
        getUsers(),
        getAllRoles(),
        getAllColleges()
      ])

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data)
      }

      if (rolesResult.success && rolesResult.data) {
        setRoles(rolesResult.data)
      }

      if (collegesResult.success && collegesResult.data) {
        setColleges(collegesResult.data)
        // Extract all departments from colleges
        const allDepts = collegesResult.data.flatMap((c: any) =>
          (c.departments || []).map((d: any) => ({
            ...d,
            college_id: c.college_id
          }))
        )
        setDepartments(allDepts)
      }
    } catch (err) {
      console.error("Failed to fetch data:", err)
      setError("فشل في تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  const filteredDepartments = selectedCollegeId
    ? departments.filter((d: any) => d.college_id === parseInt(selectedCollegeId))
    : departments

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || user.university_id?.includes(searchTerm)
    const matchesCollege = selectedCollegeId ? user.departments_users_department_idTodepartments?.college_id === parseInt(selectedCollegeId) : true
    const matchesDept = selectedDeptId ? user.department_id === parseInt(selectedDeptId) : true
    return matchesSearch && matchesCollege && matchesDept
  })

  const addNewUser = async () => {
    if (!newUserName || !newUserUniversityId || !newUserRoleId) {
      toast({ title: "❌ خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" })
      return
    }

    try {
      // تحديد القسم بناءً على نوع المستخدم
      // تحديد القسم
      let departmentId = undefined
      if (newUserDeptId) {
        departmentId = parseInt(newUserDeptId)
      }

      const result = await createUser({
        university_id: newUserUniversityId,
        full_name: newUserName,
        password: newUserPassword,
        phone: newUserPhone,
        role_id: newUserRoleId,
        department_id: departmentId
      })

      if (result.success) {
        toast({ title: "✅ تم إضافة المستخدم بنجاح" })
        setNewUserName("")
        setNewUserUniversityId("")
        setNewUserPhone("")
        setNewUserPassword("")
        setNewUserRoleId(3)
        setNewUserDeptId("")
        setNewUserCollegeId("") // إعادة تعيين الكلية
        setShowAddUser(false)
        await fetchData()
      } else {
        toast({ title: "❌ فشل الإضافة", description: result.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  const handleDeleteUser = (userId: number) => {
    setItemToDelete(userId)
    setDeleteDialogOpen(true)
  }

  const executeDelete = async () => {
    if (!itemToDelete) return

    try {
      const result = await deleteUser(itemToDelete)

      if (result.success) {
        toast({ title: "✅ تم الحذف بنجاح" })
        await fetchData()
        if (expandedUserId === itemToDelete) {
          setExpandedUserId(null)
        }
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      } else {
        toast({ title: "❌ فشل الحذف", description: result.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  const saveExpandedEdit = async () => {
    if (!expandedUserId || !expandedUserData) return

    try {
      const result = await updateUser(expandedUserId, {
        full_name: expandedUserData.full_name,
        role_id: expandedUserData.role_id,
        department_id: expandedUserData.department_id,
        is_active: expandedUserData.is_active,
        permissions: expandedUserData.permissions || [],
        password: expandedUserData.password
      })

      if (result.success) {
        toast({ title: "✅ تم التحديث بنجاح" })
        setExpandedUserId(null)
        setExpandedUserData({})
        await fetchData()
      } else {
        toast({ title: "❌ فشل التحديث", description: result.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean, e: any) => {
    e.stopPropagation();
    try {
      const result = await updateUser(userId, { is_active: !currentStatus })
      if (result.success) {
        toast({ title: !currentStatus ? "✅ تم تفعيل المستخدم" : "⛔ تم تعطيل المستخدم" })
        await fetchData()
      } else {
        toast({ title: "❌ فشل التحديث", description: result.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "❌ خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
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
          <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
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
          <h1 className="text-3xl font-bold text-foreground">إدارة المستخدمين</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} مستخدمين في النظام</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddUser(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" />
            مستخدم جديد
          </Button>
          <Button onClick={onBack} variant="ghost" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedCollegeId}
              onChange={(e) => {
                setSelectedCollegeId(e.target.value)
                setSelectedDeptId("")
              }}
              className="w-full px-3 py-2 border rounded-lg text-right bg-background"
            >
              <option value="">جميع الكليات</option>
              {colleges.map((college: any) => (
                <option key={college.college_id} value={college.college_id}>{college.college_name}</option>
              ))}
            </select>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-right bg-background"
            >
              <option value="">جميع الأقسام</option>
              {filteredDepartments.map((dept: any) => (
                <option key={dept.department_id} value={dept.department_id}>{dept.dept_name}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو رقم القيد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add User Form */}
      {showAddUser && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>إضافة مستخدم جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block" required>الاسم الكامل</Label>
                <Input placeholder="أدخل الاسم الكامل" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" required>رقم القيد / اسم المستخدم</Label>
                <Input placeholder="أدخل رقم القيد أو اسم المستخدم" value={newUserUniversityId} onChange={(e) => setNewUserUniversityId(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">رقم الجوال</Label>
                <Input placeholder="أدخل رقم الجوال (اختياري)" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" required>كلمة المرور</Label>
                <Input
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" required>نوع المستخدم (الدور)</Label>
                <select
                  value={newUserRoleId}
                  onChange={(e) => setNewUserRoleId(parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 h-9 text-sm border rounded-lg bg-transparent border-input shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] outline-none"
                >
                  {roles.map((role: any) => (
                    <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                  ))}
                </select>
              </div>

              {/* حقل ديناميكي: القسم للطالب أو الكلية لأي دور آخر (موظف، عميد، مدير، إلخ) */}
              {(() => {
                const selectedRoleName = roles.find(r => r.role_id === newUserRoleId)?.role_name?.toLowerCase();
                const isStudent = selectedRoleName === 'student';

                return (
                  <>
                    {!isStudent && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">الكلية (اختياري)</Label>
                        <select
                          value={newUserCollegeId}
                          onChange={(e) => {
                            setNewUserCollegeId(e.target.value)
                            setNewUserDeptId("")
                          }}
                          className="w-full px-3 py-1.5 h-9 text-sm border rounded-lg bg-transparent border-input shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] outline-none"
                        >
                          <option value="">اختر الكلية (اختياري للفلترة)</option>
                          {colleges.map((college: any) => (
                            <option key={college.college_id} value={college.college_id}>{college.college_name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium mb-2 block" required>القسم</Label>
                      <select
                        value={newUserDeptId}
                        onChange={(e) => setNewUserDeptId(e.target.value)}
                        className="w-full px-3 py-1.5 h-9 text-sm border rounded-lg bg-transparent border-input shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] outline-none"
                      >
                        <option value="">اختر القسم</option>
                        {departments
                          .filter((d: any) => {
                            if (isStudent) return true;
                            if (newUserCollegeId) return d.college_id === parseInt(newUserCollegeId);
                            return true;
                          })
                          .map((dept: any) => (
                            <option key={dept.department_id} value={dept.department_id}>{dept.dept_name}</option>
                          ))}
                      </select>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddUser(false)}>إلغاء</Button>
              <Button onClick={addNewUser}>إضافة</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين</CardTitle>
          <CardDescription>{filteredUsers.length} من {users.length} مستخدمين</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.map((user: any) => (
              <div key={user.user_id}>
                <div className="p-4 border rounded-lg hover:bg-slate-50 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (expandedUserId === user.user_id) {
                        setExpandedUserId(null)
                      } else {
                        setExpandedUserId(user.user_id)
                        setExpandedUserData(user)
                      }
                    }}
                    className="text-primary p-1 rounded"
                  >
                    {expandedUserId === user.user_id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="font-semibold">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.university_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الدور</p>
                      <p className="font-medium">{user.roles?.role_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">القسم</p>
                      <p className="font-medium">{user.departments_users_department_idTodepartments?.dept_name || "-"}</p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`text-xs ${user.is_active ? "text-primary" : "text-muted-foreground"}`}>
                          {user.is_active ? "نشط" : "معطّل"}
                        </span>
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={(checked) => {
                            // We need to create a synthetic event or just pass null/mock since handler expects event
                            // Actually, let's modify handler or just call it directly.
                            // The handler expects (userId, currentStatus, event).
                            // But checked change gives boolean.
                            // Let's call updateUser directly here or simpler wrapper?
                            // No, let's use the handler but adapt it.
                            handleToggleUserStatus(user.user_id, user.is_active, { stopPropagation: () => { } } as any)
                          }}
                          dir="ltr"
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.user_id); }} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {expandedUserId === user.user_id && (
                  <div className="p-6 bg-primary/5 border rounded-b-lg space-y-4">
                    <h3 className="font-semibold">تعديل بيانات المستخدم</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">الاسم الكامل</Label>
                        <Input
                          value={expandedUserData.full_name || ""}
                          onChange={(e) => setExpandedUserData({ ...expandedUserData, full_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">الدور</Label>
                        <select
                          value={expandedUserData.role_id || ""}
                          onChange={(e) => setExpandedUserData({ ...expandedUserData, role_id: parseInt(e.target.value) })}
                          className="w-full mt-1 px-3 py-2 border rounded-lg"
                        >
                          {roles.map((role: any) => (
                            <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">القسم</Label>
                        <select
                          value={expandedUserData.department_id || ""}
                          onChange={(e) => setExpandedUserData({ ...expandedUserData, department_id: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full mt-1 px-3 py-2 border rounded-lg"
                        >
                          <option value="">بدون قسم</option>
                          {departments.map((dept: any) => (
                            <option key={dept.department_id} value={dept.department_id}>{dept.dept_name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">تغيير كلمة المرور</Label>
                        <Input
                          type="password"
                          placeholder="اتركه فارغاً للإبقاء على الحالية"
                          className="mt-1"
                          onChange={(e) => setExpandedUserData({ ...expandedUserData, password: e.target.value })}
                        />
                      </div>

                      {/* Permissions Section - For all except students */}
                      {(roles.find(r => r.role_id === expandedUserData.role_id)?.role_name?.toLowerCase() !== 'student') && (
                        <div className="space-y-3 border-t pt-4 col-span-full">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <Label className="text-base font-semibold">صلاحيات النظام</Label>
                              <p className="text-xs text-muted-foreground">حدد الصلاحيات التي تريد منحها لهذا الموظف</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Review Requests */}
                            <div
                              onClick={() => {
                                const perms = expandedUserData.permissions || []
                                const hasPermission = perms.includes('review_requests')
                                const newPerms = hasPermission
                                  ? perms.filter((p: string) => p !== 'review_requests')
                                  : [...perms, 'review_requests']
                                setExpandedUserData({ ...expandedUserData, permissions: newPerms })
                              }}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${expandedUserData.permissions?.includes('review_requests')
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-gray-200 hover:border-secondary/30 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${expandedUserData.permissions?.includes('review_requests')
                                  ? 'bg-secondary text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  <CheckCircle className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">مراجعة الطلبات</p>
                                  <p className="text-xs text-muted-foreground mt-1">الموافقة، الرفض، تعديل طلبات الطلاب</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={expandedUserData.permissions?.includes('review_requests') || false}
                                  onChange={() => { }}
                                  className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary"
                                />
                              </div>
                            </div>

                            {/* Manage Forms */}
                            <div
                              onClick={() => {
                                const perms = expandedUserData.permissions || []
                                const hasPermission = perms.includes('manage_forms')
                                const newPerms = hasPermission
                                  ? perms.filter((p: string) => p !== 'manage_forms')
                                  : [...perms, 'manage_forms']
                                setExpandedUserData({ ...expandedUserData, permissions: newPerms })
                              }}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${expandedUserData.permissions?.includes('manage_forms')
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-gray-200 hover:border-secondary/30 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${expandedUserData.permissions?.includes('manage_forms')
                                  ? 'bg-secondary text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">إدارة النماذج</p>
                                  <p className="text-xs text-muted-foreground mt-1">إنشاء وتعديل ونشر نماذج الطلبات</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={expandedUserData.permissions?.includes('manage_forms') || false}
                                  onChange={() => { }}
                                  className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary"
                                />
                              </div>
                            </div>

                            {/* Manage Users */}
                            <div
                              onClick={() => {
                                const perms = expandedUserData.permissions || []
                                const hasPermission = perms.includes('manage_users')
                                const newPerms = hasPermission
                                  ? perms.filter((p: string) => p !== 'manage_users')
                                  : [...perms, 'manage_users']
                                setExpandedUserData({ ...expandedUserData, permissions: newPerms })
                              }}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${expandedUserData.permissions?.includes('manage_users')
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-gray-200 hover:border-secondary/30 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${expandedUserData.permissions?.includes('manage_users')
                                  ? 'bg-secondary text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  <UserCheck className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">إدارة المستخدمين</p>
                                  <p className="text-xs text-muted-foreground mt-1">إضافة، تعديل، حذف المستخدمين</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={expandedUserData.permissions?.includes('manage_users') || false}
                                  onChange={() => { }}
                                  className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary"
                                />
                              </div>
                            </div>

                            {/* Manage Departments */}
                            <div
                              onClick={() => {
                                const perms = expandedUserData.permissions || []
                                const hasPermission = perms.includes('manage_departments')
                                const newPerms = hasPermission
                                  ? perms.filter((p: string) => p !== 'manage_departments')
                                  : [...perms, 'manage_departments']
                                setExpandedUserData({ ...expandedUserData, permissions: newPerms })
                              }}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${expandedUserData.permissions?.includes('manage_departments')
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-gray-200 hover:border-secondary/30 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${expandedUserData.permissions?.includes('manage_departments')
                                  ? 'bg-secondary text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  <Building2 className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">إدارة الأقسام والكليات</p>
                                  <p className="text-xs text-muted-foreground mt-1">إضافة وتعديل الأقسام والكليات</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={expandedUserData.permissions?.includes('manage_departments') || false}
                                  onChange={() => { }}
                                  className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary"
                                />
                              </div>
                            </div>

                            {/* View Reports */}
                            <div
                              onClick={() => {
                                const perms = expandedUserData.permissions || []
                                const hasPermission = perms.includes('view_reports')
                                const newPerms = hasPermission
                                  ? perms.filter((p: string) => p !== 'view_reports')
                                  : [...perms, 'view_reports']
                                setExpandedUserData({ ...expandedUserData, permissions: newPerms })
                              }}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${expandedUserData.permissions?.includes('view_reports')
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-gray-200 hover:border-secondary/30 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${expandedUserData.permissions?.includes('view_reports')
                                  ? 'bg-secondary text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  <BarChart3 className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">عرض التقارير</p>
                                  <p className="text-xs text-muted-foreground mt-1">الوصول للتقارير والإحصائيات</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={expandedUserData.permissions?.includes('view_reports') || false}
                                  onChange={() => { }}
                                  className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary"
                                />
                              </div>
                            </div>

                            {/* Manage Workflows */}
                            <div
                              onClick={() => {
                                const perms = expandedUserData.permissions || []
                                const hasPermission = perms.includes('manage_workflows')
                                const newPerms = hasPermission
                                  ? perms.filter((p: string) => p !== 'manage_workflows')
                                  : [...perms, 'manage_workflows']
                                setExpandedUserData({ ...expandedUserData, permissions: newPerms })
                              }}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${expandedUserData.permissions?.includes('manage_workflows')
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-gray-200 hover:border-secondary/30 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${expandedUserData.permissions?.includes('manage_workflows')
                                  ? 'bg-secondary text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  <Workflow className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">إدارة مسارات العمل</p>
                                  <p className="text-xs text-muted-foreground mt-1">إنشاء وتعديل مسارات اعتماد الطلبات</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={expandedUserData.permissions?.includes('manage_workflows') || false}
                                  onChange={() => { }}
                                  className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary"
                                />
                              </div>
                            </div>

                            {/* Grant Delegations */}
                            <div
                              onClick={() => {
                                const perms = expandedUserData.permissions || []
                                const hasPermission = perms.includes('grant_delegations')
                                const newPerms = hasPermission
                                  ? perms.filter((p: string) => p !== 'grant_delegations')
                                  : [...perms, 'grant_delegations']
                                setExpandedUserData({ ...expandedUserData, permissions: newPerms })
                              }}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${expandedUserData.permissions?.includes('grant_delegations')
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-gray-200 hover:border-secondary/30 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${expandedUserData.permissions?.includes('grant_delegations')
                                  ? 'bg-secondary text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  <UserX className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">منح التفويضات</p>
                                  <p className="text-xs text-muted-foreground mt-1">تفويض الصلاحيات لموظفين آخرين</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={expandedUserData.permissions?.includes('grant_delegations') || false}
                                  onChange={() => { }}
                                  className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary"
                                />
                              </div>
                            </div>

                            {/* Audit Access */}
                            <div
                              onClick={() => {
                                const perms = expandedUserData.permissions || []
                                const hasPermission = perms.includes('audit_access')
                                const newPerms = hasPermission
                                  ? perms.filter((p: string) => p !== 'audit_access')
                                  : [...perms, 'audit_access']
                                setExpandedUserData({ ...expandedUserData, permissions: newPerms })
                              }}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${expandedUserData.permissions?.includes('audit_access')
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-gray-200 hover:border-secondary/30 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${expandedUserData.permissions?.includes('audit_access')
                                  ? 'bg-secondary text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  <Search className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">سجل التدقيق</p>
                                  <p className="text-xs text-muted-foreground mt-1">الوصول لسجل الأحداث والتدقيق</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={expandedUserData.permissions?.includes('audit_access') || false}
                                  onChange={() => { }}
                                  className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Permissions Section - For all except students */}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setExpandedUserId(null)}>
                        <X className="w-4 h-4 mr-2" />
                        إلغاء
                      </Button>
                      <Button onClick={saveExpandedEdit}>
                        <Save className="w-4 h-4 mr-2" />
                        حفظ التعديلات
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا المستخدم؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف المستخدم وجميع البيانات المرتبطة به.
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
    </div >
  )
}
