"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import * as bcrypt from "bcryptjs"

export async function getAdminStats() {
    const totalUsers = await db.users.count()
    const totalRequests = await db.requests.count()
    const activeRequests = await db.requests.count({ where: { status: 'pending' } })
    const totalForms = await db.form_templates.count({ where: { is_active: true } })

    // Calculate completion rate
    const completedRequests = await db.requests.count({
        where: { status: { in: ['approved', 'rejected'] } }
    })
    const completionRate = totalRequests > 0
        ? Math.round((completedRequests / totalRequests) * 100)
        : 0

    return {
        totalUsers,
        totalRequests,
        activeRequests,
        totalForms,
        completionRate
    }
}

export async function getCurrentUserScope(requesterId: string) {
    if (!requesterId) return { success: false, error: "Missing requester ID" }

    const requester = await db.users.findUnique({
        where: { university_id: requesterId },
        include: {
            roles: true,
            departments_users_department_idTodepartments: {
                include: { colleges: true }
            }
        }
    })

    if (!requester) return { success: false, error: "User not found" }

    const roleName = requester.roles.role_name.toLowerCase()

    // Determine College ID
    let collegeId: number | undefined = undefined
    if (requester.departments_users_department_idTodepartments?.colleges?.college_id) {
        collegeId = requester.departments_users_department_idTodepartments.colleges.college_id
    } else {
        // Try finding if they are dean of a college
        const college = await db.colleges.findFirst({
            where: { dean_id: requester.user_id }
        })
        if (college) collegeId = college.college_id
    }

    return {
        success: true,
        data: {
            role: roleName,
            collegeId: collegeId,
            departmentId: requester.department_id
        }
    }
}

export async function getUsers(
    page: number = 1,
    limit: number = 50,
    requesterId?: string,
    search?: string,
    filterCollegeId?: string, // user selected
    filterDeptId?: string    // user selected
) {
    try {
        const skip = (page - 1) * limit

        // Build base where clause based on requester role/scope
        // Default to Fail Closed (Show nothing) if no valid scope found
        let baseWhere: Prisma.usersWhereInput = { user_id: -1 }

        if (requesterId) {
            console.log("[getUsers] Checking scope for:", requesterId)
            const requester = await db.users.findUnique({
                where: { university_id: requesterId },
                include: {
                    roles: true,
                    departments_users_department_idTodepartments: {
                        include: { colleges: true }
                    }
                }
            })

            if (requester) {
                const roleName = requester.roles.role_name.toLowerCase()

                if (roleName === 'admin') {
                    // Admin sees all (base is empty)
                    baseWhere = {}
                }
                // Dean Scope: Only users in their college
                else if (roleName === 'dean') {
                    // 1. Try to find college via department
                    let collegeId = requester.departments_users_department_idTodepartments?.colleges?.college_id

                    // 2. If not found, try to find college where this user is the dean
                    if (!collegeId) {
                        const college = await db.colleges.findFirst({
                            where: { dean_id: requester.user_id }
                        })
                        if (college) {
                            collegeId = college.college_id
                        }
                    }

                    if (collegeId) {
                        baseWhere = {
                            departments_users_department_idTodepartments: {
                                college_id: collegeId
                            }
                        }
                    }
                }
                // Head Scope: Only users in their department
                else if (roleName === 'head_of_department' || roleName === 'manager' || roleName === 'head') {
                    const deptId = requester.department_id
                    if (deptId) {
                        baseWhere = {
                            department_id: deptId
                        }
                    }
                }
            }
        }

        // Apply filters on top of base scope
        const whereClause: Prisma.usersWhereInput = {
            AND: [
                baseWhere,
                search ? {
                    OR: [
                        { full_name: { contains: search } },
                        { university_id: { contains: search } }
                    ]
                } : {},
                filterCollegeId ? {
                    departments_users_department_idTodepartments: {
                        college_id: parseInt(filterCollegeId)
                    }
                } : {},
                filterDeptId ? {
                    department_id: parseInt(filterDeptId)
                } : {}
            ]
        }

        const [users, total] = await Promise.all([
            db.users.findMany({
                where: whereClause,
                include: {
                    roles: true,
                    departments_users_department_idTodepartments: {
                        include: {
                            colleges: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip: skip,
                take: limit
            }),
            db.users.count({ where: whereClause })
        ])

        // Parse custom_permissions JSON for each user
        const usersWithPermissions = users.map((user: any) => ({
            ...user,
            permissions: user.custom_permissions ? JSON.parse(user.custom_permissions) : []
        }))

        return {
            success: true,
            data: usersWithPermissions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    } catch (error) {
        console.error("Get Users Error:", error)
        return { success: false, error: "فشل في تحميل المستخدمين" }
    }
}

export async function createUser(data: any) {
    try {
        const password = data.password || "123" // Use provided password or default
        const hash = await bcrypt.hash(password, 10)

        // Fetch the role to get its default permissions
        const role = await db.roles.findUnique({
            where: { role_id: parseInt(data.role_id) }
        })

        let customPermissions: string[] | null = null

        if (role) {
            // Start with role's default permissions
            const currentPermissions = (role.permissions as string[]) || []
            const newPermissions = new Set(currentPermissions)

            // Add automatic permissions based on role
            if (role.role_name === 'head_of_department' || role.role_name === 'manager' || role.role_name === 'dean') {
                newPermissions.add('review_requests')
                newPermissions.add('manage_forms')
                // Managers also need to see reports usually
                newPermissions.add('view_reports')
            } else if (role.role_name === 'admin') {
                newPermissions.add('all')
            }

            // Only set custom_permissions if we added something new or if we want to enforce specific permissions
            if (newPermissions.size > 0) {
                customPermissions = Array.from(newPermissions)
            }
        }

        await db.users.create({
            data: {
                university_id: data.university_id,
                full_name: data.full_name,
                password_hash: hash,
                phone: data.phone || null,
                role_id: parseInt(data.role_id),
                department_id: data.department_id ? parseInt(data.department_id) : null,
                custom_permissions: customPermissions ? JSON.stringify(customPermissions) : null
            }
        })
        // revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error("Create User Error:", e)
        return { success: false, error: "Failed to create user" }
    }
}

/**
 * Update user
 */
export async function updateUser(userId: number, data: any) {
    try {
        const updateData: any = {}
        if (data.full_name) updateData.full_name = data.full_name
        if (data.phone !== undefined) updateData.phone = data.phone
        if (data.role_id) updateData.role_id = parseInt(data.role_id)
        if (data.department_id !== undefined) {
            updateData.department_id = data.department_id ? parseInt(data.department_id) : null
        }
        if (data.is_active !== undefined) updateData.is_active = data.is_active
        if (data.permissions !== undefined) {
            console.log("Saving permissions:", data.permissions)
            updateData.custom_permissions = JSON.stringify(data.permissions)
        }
        if (data.password) {
            const hash = await bcrypt.hash(data.password, 10)
            updateData.password_hash = hash
        }

        console.log("Update Data:", updateData)

        const result = await db.users.update({
            where: { user_id: userId },
            data: updateData
        })

        console.log("Update Result:", result)

        // revalidatePath('/admin')
        return { success: true }
    } catch (e: any) {
        console.error("Update User Error:", e)
        console.error("Error details:", e.message, e.code)
        return { success: false, error: e.message || "فشل في تحديث المستخدم" }
    }
}

/**
 * Deactivate user (soft delete)
 */
export async function deleteUser(userId: number) {
    try {
        await db.users.update({
            where: { user_id: userId },
            data: { is_active: false }
        })

        // revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error("Delete User Error:", e)
        return { success: false, error: "فشل في حذف المستخدم" }
    }
}

/**
 * Get all roles
 */
export async function getAllRoles() {
    try {
        const roles = await db.roles.findMany({
            orderBy: { role_name: 'asc' }
        })

        return {
            success: true,
            data: roles
        }
    } catch (error) {
        console.error("Get Roles Error:", error)
        return { success: false, error: "فشل في تحميل الأدوار" }
    }
}

/**
 * Get reports data for admin dashboard
 */
export async function getReportsData(startDate?: Date, endDate?: Date, requesterId?: string) {
    try {
        let whereClause: any = {}

        if (startDate || endDate) {
            whereClause.submitted_at = {}
            if (startDate) whereClause.submitted_at.gte = startDate
            if (endDate) whereClause.submitted_at.lte = endDate
        }

        // Apply Scope Restrictions
        if (requesterId) {
            const scope = await getCurrentUserScope(requesterId)
            if (scope.success && scope.data) {
                const { role, collegeId, departmentId } = scope.data

                if (role === 'admin') {
                    // No restrictions
                } else if (role === 'dean' && collegeId) {
                    whereClause.users = {
                        departments_users_department_idTodepartments: {
                            college_id: collegeId
                        }
                    }
                } else if ((role === 'head' || role === 'manager' || role === 'head_of_department') && departmentId) {
                    whereClause.users = {
                        department_id: departmentId
                    }
                } else {
                    // Fail closed for others
                    return { success: true, data: { stats: { total: 0, pending: 0, approved: 0, rejected: 0 }, byStatus: [], byType: [], recentRequests: [] } }
                }
            } else {
                return { success: true, data: { stats: { total: 0, pending: 0, approved: 0, rejected: 0 }, byStatus: [], byType: [], recentRequests: [] } }
            }
        } else {
            // If no requesterId provided, we might fail closed or assume admin? 
            // Ideally fail closed to be safe, but existing calls might break.
            // Given the strict requirement, let's fail closed if not admin context explicitly known or handled.
            // But for now, let's allow it to behave as before if param missing (or maybe fail closed is safer).
            // Let's decided to fail closed to be secure.
            console.warn("getReportsData called without requesterId - returning empty")
            return { success: true, data: { stats: { total: 0, pending: 0, approved: 0, rejected: 0 }, byStatus: [], byType: [], recentRequests: [] } }
        }

        // 1. Calculate Stats (Total, Pending, Approved, Rejected)
        const total = await db.requests.count({ where: whereClause })
        const pending = await db.requests.count({
            where: { ...whereClause, status: 'pending' }
        })
        const approved = await db.requests.count({
            where: { ...whereClause, status: 'approved' }
        })
        const rejected = await db.requests.count({
            where: { ...whereClause, status: 'rejected' }
        })

        // 2. Requests by Status (for Chart)
        const requestsByStatus = await db.requests.groupBy({
            by: ['status'],
            where: whereClause,
            _count: true
        })

        // Format for frontend: [{ status: 'pending', count: 10 }, ...]
        const byStatus = requestsByStatus.map(item => ({
            status: item.status,
            count: item._count
        }))


        // 3. Requests by Form Type (for Chart)
        const requestsByType = await db.requests.groupBy({
            by: ['form_id'],
            where: whereClause,
            _count: true
        })

        // Get form names
        const formIds = requestsByType.map(r => r.form_id).filter(Boolean) as number[]
        const forms = await db.form_templates.findMany({
            where: { form_id: { in: formIds } },
            select: { form_id: true, name: true }
        })

        // Format for frontend: [{ type_name: 'Form A', count: 5 }, ...]
        const byType = requestsByType.map(r => ({
            type_name: forms.find(f => f.form_id === r.form_id)?.name || "غير محدد",
            count: r._count
        }))

        // 4. Recent Requests
        const recentRequests = await db.requests.findMany({
            where: whereClause,
            take: 5,
            orderBy: { submitted_at: 'desc' },
            include: {
                users: {
                    select: { full_name: true }
                },
                form_templates: {
                    select: { name: true }
                }
            }
        })

        // Format recent requests to match frontend expectation
        const formattedRecent = recentRequests.map(req => ({
            request_id: req.request_id,
            status: req.status,
            submitted_at: req.submitted_at,
            requester: {
                full_name: req.users?.full_name
            },
            form_templates: {
                name: req.form_templates?.name
            }
        }))

        return {
            success: true,
            data: {
                stats: {
                    total,
                    pending,
                    approved,
                    rejected
                },
                byStatus,
                byType,
                recentRequests: formattedRecent
            }
        }
    } catch (error) {
        console.error("Get Reports Data Error:", error)
        return { success: false, error: "فشل في تحميل بيانات التقارير" }
    }
}

/**
 * Get audit log (request actions)
 */
/**
 * Get audit log (request actions)
 */
export async function getAuditLog(filters?: {
    userId?: number
    requestId?: number
    startDate?: Date
    endDate?: Date
    limit?: number
    requesterId?: string
}) {
    try {
        let whereClause: any = {}

        if (filters?.userId) whereClause.actor_id = filters.userId
        if (filters?.requestId) whereClause.request_id = filters.requestId
        if (filters?.startDate || filters?.endDate) {
            whereClause.created_at = {}
            if (filters.startDate) whereClause.created_at.gte = filters.startDate
            if (filters.endDate) whereClause.created_at.lte = filters.endDate
        }

        // Apply Scope Restrictions
        if (filters?.requesterId) {
            const scope = await getCurrentUserScope(filters.requesterId)
            if (scope.success && scope.data) {
                const { role, collegeId, departmentId } = scope.data

                if (role === 'admin') {
                    // No restrictions
                } else if (role === 'dean' && collegeId) {
                    // Show actions where the actor (user) is in the college
                    whereClause.users = {
                        departments_users_department_idTodepartments: {
                            college_id: collegeId
                        }
                    }
                } else if ((role === 'head' || role === 'manager' || role === 'head_of_department') && departmentId) {
                    // Show actions where the actor is in the department
                    whereClause.users = {
                        department_id: departmentId
                    }
                } else {
                    return { success: true, data: [] }
                }
            } else {
                return { success: true, data: [] }
            }
        } else {
            console.warn("getAuditLog called without requesterId - returning empty")
            return { success: true, data: [] }
        }

        const actions = await db.request_actions.findMany({
            where: whereClause,
            include: {
                users: true,
                requests: {
                    include: {
                        form_templates: true
                    }
                },
                workflow_steps: true
            },
            orderBy: { created_at: 'desc' },
            take: filters?.limit || 100
        })

        return {
            success: true,
            data: actions
        }
    } catch (error) {
        console.error("Get Audit Log Error:", error)
        return { success: false, error: "فشل في تحميل سجل التدقيق" }
    }
}

/**
 * Get all possible approvers (Roles + Users)
 */
export async function getApproversList(requesterId?: string) {
    try {
        let userWhereClause: any = { is_active: true }

        if (requesterId) {
            const requester = await db.users.findUnique({
                where: { university_id: requesterId },
                include: {
                    roles: true,
                    departments_users_department_idTodepartments: {
                        include: { colleges: true }
                    }
                }
            })

            if (requester) {
                const roleName = requester.roles.role_name.toLowerCase()

                if (roleName === 'dean') {
                    let collegeId = requester.departments_users_department_idTodepartments?.colleges?.college_id

                    if (!collegeId) {
                        const college = await db.colleges.findFirst({
                            where: { dean_id: requester.user_id }
                        })
                        if (college) {
                            collegeId = college.college_id
                        }
                    }

                    if (collegeId) {
                        userWhereClause = {
                            is_active: true,
                            departments_users_department_idTodepartments: {
                                college_id: collegeId
                            }
                        }
                    } else {
                        // Fail Closed
                        userWhereClause = { user_id: -1 }
                    }
                } else if (roleName === 'head_of_department' || roleName === 'manager' || roleName === 'head') {
                    const deptId = requester.department_id
                    if (deptId) {
                        userWhereClause = {
                            is_active: true,
                            department_id: deptId
                        }
                    } else {
                        // Fail Closed
                        userWhereClause = { user_id: -1 }
                    }
                }
            }
        }

        const roles = await db.roles.findMany({
            orderBy: { role_name: 'asc' }
        })

        const users = await db.users.findMany({
            where: userWhereClause,
            select: {
                user_id: true,
                full_name: true,
                university_id: true,
                roles: {
                    select: { role_name: true }
                }
            },
            orderBy: { full_name: 'asc' }
        })

        return {
            success: true,
            data: {
                roles,
                users
            }
        }
    } catch (error) {
        console.error("Get Approvers Error:", error)
        return { success: false, error: "فشل في تحميل قائمة الموافقين" }
    }
}

