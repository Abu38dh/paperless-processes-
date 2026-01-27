"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
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

export async function getUsers(page: number = 1, limit: number = 50) {
    try {
        const skip = (page - 1) * limit

        const [users, total] = await Promise.all([
            db.users.findMany({
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
            db.users.count()
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
            if (role.role_name === 'manager' || role.role_name === 'dean') {
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
export async function getReportsData(startDate?: Date, endDate?: Date) {
    try {
        const whereClause: any = {}

        if (startDate || endDate) {
            whereClause.submitted_at = {}
            if (startDate) whereClause.submitted_at.gte = startDate
            if (endDate) whereClause.submitted_at.lte = endDate
        }

        // Requests by status
        const requestsByStatus = await db.requests.groupBy({
            by: ['status'],
            where: whereClause,
            _count: true
        })

        // Requests by form type
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

        const requestsByTypeWithNames = requestsByType.map(r => ({
            formId: r.form_id,
            formName: forms.find(f => f.form_id === r.form_id)?.name || "غير محدد",
            count: r._count
        }))

        // Monthly trends (last 12 months)
        const monthlyData = await db.requests.findMany({
            where: whereClause,
            select: {
                submitted_at: true
            }
        })

        return {
            success: true,
            data: {
                requestsByStatus,
                requestsByType: requestsByTypeWithNames,
                monthlyData
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
export async function getAuditLog(filters?: {
    userId?: number
    requestId?: number
    startDate?: Date
    endDate?: Date
    limit?: number
}) {
    try {
        const whereClause: any = {}

        if (filters?.userId) whereClause.actor_id = filters.userId
        if (filters?.requestId) whereClause.request_id = filters.requestId
        if (filters?.startDate || filters?.endDate) {
            whereClause.created_at = {}
            if (filters.startDate) whereClause.created_at.gte = filters.startDate
            if (filters.endDate) whereClause.created_at.lte = filters.endDate
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
export async function getApproversList() {
    try {
        const roles = await db.roles.findMany({
            orderBy: { role_name: 'asc' }
        })

        const users = await db.users.findMany({
            where: { is_active: true },
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

