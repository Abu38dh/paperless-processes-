"use client"
// Force rebuild

import { useState, useEffect, useRef } from "react"
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
import { translateRole } from "@/lib/translations"
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
  currentUserId?: string
}

export default function AdminUsersPage({ onBack, currentUserId }: AdminUserPageProps) {
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

  const [isCollegeDisabled, setIsCollegeDisabled] = useState(false)
  const [isDeptDisabled, setIsDeptDisabled] = useState(false)
  const [currentUserScope, setCurrentUserScope] = useState<{ role?: string, collegeId?: number | null, departmentId?: number | null }>({})

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  /* Infinite Scroll & Persistence Logic */
  const observerTarget = useRef(null)

  useEffect(() => {
    // Initial load or filter change
    if (page === 1) {
      fetchData()
    }
  }, [page, searchTerm, selectedCollegeId, selectedDeptId, currentUserId])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && page < totalPages) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 1.0 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [loading, totalPages, page])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
    setUsers([])
  }, [searchTerm, selectedCollegeId, selectedDeptId])


  const fetchData = async () => {
    setError(null)
    setLoading(true)

    try {
      // NOTE: For Infinite Scroll, we only want to fetch permissions/colleges once (on mount or page 1)
      // but keeping it simple for now is fine, just optimizing the users fetch is key.

      const [usersResult, rolesResult, collegesResult] = await Promise.all([
        getUsers(page, 50, currentUserId, searchTerm, selectedCollegeId, selectedDeptId),
        getAllRoles(),
        getAllColleges()
      ])

      // Determine scope and filter data
      let availableColleges = collegesResult.data || []

      // Extract all departments initially
      let allDepts = availableColleges.flatMap((c: any) =>
        (c.departments || []).map((d: any) => ({
          ...d,
          college_id: c.college_id
        }))
      )

      if (currentUserId) {
        try {
          const { getCurrentUserScope } = await import("@/app/actions/admin")
          const scopeResult = await getCurrentUserScope(currentUserId)

          if (scopeResult.success && scopeResult.data) {
            setCurrentUserScope(scopeResult.data) // Store scope for UI logic
            const { role, collegeId, departmentId } = scopeResult.data

            if (role === 'dean' && collegeId) {
              availableColleges = availableColleges.filter((c: any) => c.college_id === collegeId)
              allDepts = allDepts.filter((d: any) => d.college_id === collegeId)

              if (!selectedCollegeId) setSelectedCollegeId(collegeId.toString())
              setIsCollegeDisabled(true)
            }
            else if ((role === 'head' || role === 'manager' || role === 'head_of_department') && departmentId && collegeId) {
              availableColleges = availableColleges.filter((c: any) => c.college_id === collegeId)
              allDepts = allDepts.filter((d: any) => d.department_id === departmentId)

              if (!selectedCollegeId) setSelectedCollegeId(collegeId.toString())
              setIsCollegeDisabled(true)
              if (!selectedDeptId) setSelectedDeptId(departmentId.toString())
              setIsDeptDisabled(true)
            }
          }
        } catch (e) {
          console.error("Error fetching scope:", e)
        }
      }

      if (usersResult.success && usersResult.data) {
        if (page === 1) {
          setUsers(usersResult.data)
        } else {
          setUsers(prev => [...prev, ...usersResult.data])
        }

        if (usersResult.pagination) {
          setTotalPages(usersResult.pagination.totalPages)
        }
      } else {
        setError(usersResult.error || "فشل في تحميل المستخدمين")
      }

      if (rolesResult.success && rolesResult.data) {
        setRoles(rolesResult.data)
      }

      // Set filtered colleges and departments
      setColleges(availableColleges)
      setDepartments(allDepts)

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

  // Server side filtering is now active, so filteredUsers is just users
  const filteredUsers = users

  const addNewUser = async () => {
    if (!newUserName || !newUserUniversityId || !newUserRoleId) {
      toast({ title: "❌ خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" })
      return
    }

    try {
      // تحديد القسم بناءً على نوع المستخدم
      // تحديد القسم
      let departmentId = undefined

      if (currentUserScope.departmentId) {
        departmentId = currentUserScope.departmentId
      } else if (newUserDeptId) {
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

        // PERSISTENCE: Prepend new user instead of full reload
        // We might not have the full user object with joined tables perfectly, calls for a reload mostly
        // BUT to keep scroll, we could just reload page 1 or insert a mock.
        // For "Add", it's usually acceptable to reload or just prepend.
        // Let's reset to Page 1 to show the new user at top.
        setPage(1)
        fetchData()
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

        // PERSISTENCE: Remove from local state
        setUsers(prev => prev.filter(u => u.user_id !== itemToDelete))

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

        // PERSISTENCE: Update local state without fetching
        setUsers(prev => prev.map(u =>
          u.user_id === expandedUserId
            ? { ...u, ...expandedUserData, roles: roles.find(r => r.role_id === expandedUserData.role_id), departments_users_department_idTodepartments: departments.find(d => d.department_id == expandedUserData.department_id) }
            : u
        ))

        setExpandedUserId(null)
        setExpandedUserData({})
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

        // PERSISTENCE: Update local state
        setUsers(prev => prev.map(u =>
          u.user_id === userId ? { ...u, is_active: !currentStatus } : u
        ))

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
              disabled={isCollegeDisabled}
              className={`w-full px-3 py-2 border rounded-lg text-right bg-background ${isCollegeDisabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
            >
              {!isCollegeDisabled && <option value="">جميع الكليات</option>}
              {colleges.map((college: any) => (
                <option key={college.college_id} value={college.college_id}>{college.name}</option>
              ))}
            </select>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              disabled={isDeptDisabled}
              className={`w-full px-3 py-2 border rounded-lg text-right bg-background ${isDeptDisabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
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
                  {roles
                    .filter(role => {
                      if (!currentUserScope.role || currentUserScope.role === 'admin') return true;

                      const rName = role.role_name.toLowerCase();
                      if (currentUserScope.role === 'dean') {
                        // Dean can create: Head, Manager, Employee, Student (Not Admin or another Dean)
                        return ['head', 'manager', 'head_of_department', 'employee', 'student'].includes(rName);
                      }
                      if (currentUserScope.role === 'head' || currentUserScope.role === 'manager' || currentUserScope.role === 'head_of_department') {
                        // Head can create: Only Student
                        return rName === 'student';
                      }
                      return false;
                    })
                    .map((role: any) => (
                      <option key={role.role_id} value={role.role_id}>{translateRole(role.role_name)}</option>
                    ))}
                </select>
              </div>

              {/* حقل ديناميكي: القسم للطالب أو الكلية لأي دور آخر (موظف، عميد، مدير، إلخ) */}
              {(() => {
                const selectedRoleName = roles.find(r => r.role_id === newUserRoleId)?.role_name?.toLowerCase();
                const isStudent = selectedRoleName === 'student';

                // Determine restrictions
                const isRestrictedCollege = !!currentUserScope.collegeId;
                const isRestrictedDept = !!currentUserScope.departmentId;

                return (
                  <>
                    {!isStudent && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">الكلية (اختياري)</Label>
                        <select
                          value={isRestrictedCollege ? (currentUserScope.collegeId ?? "") : newUserCollegeId}
                          onChange={(e) => {
                            if (!isRestrictedCollege) {
                              setNewUserCollegeId(e.target.value)
                              setNewUserDeptId("")
                            }
                          }}
                          disabled={isRestrictedCollege}
                          className={`w-full px-3 py-1.5 h-9 text-sm border rounded-lg bg-transparent border-input shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] outline-none ${isRestrictedCollege ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
                        >
                          {!isRestrictedCollege && <option value="">اختر الكلية (اختياري للفلترة)</option>}
                          {colleges
                            .filter((c: any) => isRestrictedCollege ? c.college_id === currentUserScope.collegeId : true)
                            .map((college: any) => (
                              <option key={college.college_id} value={college.college_id}>{college.name}</option>
                            ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium mb-2 block" required>القسم</Label>
                      <select
                        value={isRestrictedDept ? (currentUserScope.departmentId ?? "") : newUserDeptId}
                        onChange={(e) => {
                          if (!isRestrictedDept) setNewUserDeptId(e.target.value)
                        }}
                        disabled={isRestrictedDept}
                        className={`w-full px-3 py-1.5 h-9 text-sm border rounded-lg bg-transparent border-input shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] outline-none ${isRestrictedDept ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
                      >
                        {!isRestrictedDept && <option value="">اختر القسم</option>}
                        {departments
                          .filter((d: any) => {
                            // If exact restricted department
                            if (isRestrictedDept) return d.department_id === currentUserScope.departmentId;

                            // If restricted to college
                            if (isRestrictedCollege) return d.college_id === currentUserScope.collegeId;

                            // If user selected a college in the form
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
                      <p className="font-medium">{translateRole(user.roles?.role_name)}</p>
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
                            <option key={role.role_id} value={role.role_id}>{translateRole(role.role_name)}</option>
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

          {/* Infinite Scroll Sentinel */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
            {loading && page > 1 && <span className="custom-loader"></span>}
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
