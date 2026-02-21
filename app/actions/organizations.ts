"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

import { logAuditAction } from "./audit"
// ... (existing imports)

/**
 * Get all colleges with their deans
 */
export async function getAllColleges() {
    // ... (keep existing)
    try {
        const colleges = await db.colleges.findMany({
            include: {
                users: true, // dean
                departments: {
                    include: {
                        users_departments_manager_idTousers: true // manager
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        return {
            success: true,
            data: colleges
        }
    } catch (error) {
        return { success: false, error: "فشل في تحميل الكليات" }
    }
}

/**
 * Get organization structure (lightweight for dropdowns)
 */
export async function getOrganizationStructure() {
    try {
        const colleges = await db.colleges.findMany({
            select: {
                college_id: true,
                name: true,
                departments: {
                    select: {
                        department_id: true,
                        dept_name: true
                    },
                    orderBy: { dept_name: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        })

        return {
            success: true,
            data: colleges
        }

    } catch (error) {
        console.error("Get Organization Structure Error:", error)
        return { success: false, error: "فشل في تحميل هيكل الكليات" }
    }
}

/**
 * Create new college
 */
export async function createCollege(data: {
    name: string
    dean_id?: number
}, requesterId?: string) {
    try {
        const college = await db.colleges.create({
            data: {
                name: data.name,
                dean_id: data.dean_id || null
            }
        })

        if (requesterId) {
            const executor = await db.users.findUnique({ where: { university_id: requesterId } })
            await logAuditAction(executor?.user_id, 'CREATE', 'COLLEGE', college.name, { new_id: college.college_id })
        }

        // revalidatePath('/admin')
        return { success: true, data: college }
    } catch (error) {
        console.error("Create College Error:", error)
        return { success: false, error: "فشل في إنشاء الكلية" }
    }
}

/**
 * Update college
 */
export async function updateCollege(
    collegeId: number,
    data: {
        name?: string
        dean_id?: number | null
    },
    requesterId?: string
) {
    try {
        const updateData: any = {}
        if (data.name !== undefined) updateData.name = data.name
        if (data.dean_id !== undefined) updateData.dean_id = data.dean_id

        const college = await db.colleges.update({
            where: { college_id: collegeId },
            data: updateData
        })

        if (requesterId) {
            const executor = await db.users.findUnique({ where: { university_id: requesterId } })
            await logAuditAction(executor?.user_id, 'UPDATE', 'COLLEGE', college.name, { updated_fields: Object.keys(updateData) })
        }

        // revalidatePath('/admin')
        return { success: true, data: college }
    } catch (error) {
        console.error("Update College Error:", error)
        return { success: false, error: "فشل في تحديث الكلية" }
    }
}

/**
 * Delete college
 */
export async function deleteCollege(collegeId: number, requesterId?: string) {
    try {
        // Check if college has departments
        const departments = await db.departments.findMany({
            where: { college_id: collegeId }
        })

        if (departments.length > 0) {
            return {
                success: false,
                error: "لا يمكن حذف الكلية لأنها تحتوي على أقسام"
            }
        }

        const college = await db.colleges.findUnique({ where: { college_id: collegeId } })

        await db.colleges.delete({
            where: { college_id: collegeId }
        })

        if (requesterId) {
            const executor = await db.users.findUnique({ where: { university_id: requesterId } })
            await logAuditAction(executor?.user_id, 'DELETE', 'COLLEGE', college?.name || collegeId.toString(), null)
        }

        // revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error("Delete College Error:", error)
        return { success: false, error: "فشل في حذف الكلية" }
    }
}

/**
 * Get all departments
 */
export async function getAllDepartments() {
    try {
        const departments = await db.departments.findMany({
            include: {
                colleges: true,
                users_departments_manager_idTousers: true
            },
            orderBy: { dept_name: 'asc' }
        })

        return {
            success: true,
            data: departments
        }
    } catch (error) {
        console.error("Get All Departments Error:", error)
        return { success: false, error: "فشل في تحميل الأقسام" }
    }
}


/**
 * Create new department
 */
export async function createDepartment(data: {
    dept_name: string
    college_id?: number | null
    manager_id?: number | null
}, requesterId?: string) {
    try {
        const department = await db.departments.create({
            data: {
                dept_name: data.dept_name,
                college_id: data.college_id || null,
                manager_id: data.manager_id || null
            }
        })

        if (requesterId) {
            const executor = await db.users.findUnique({ where: { university_id: requesterId } })
            await logAuditAction(executor?.user_id, 'CREATE', 'DEPARTMENT', department.dept_name, { new_id: department.department_id })
        }

        // revalidatePath('/admin')
        return { success: true, data: department }
    } catch (error) {
        console.error("Create Department Error:", error)
        return { success: false, error: "فشل في إنشاء القسم" }
    }
}

/**
 * Update department
 */
export async function updateDepartment(
    departmentId: number,
    data: {
        dept_name?: string
        college_id?: number
        manager_id?: number | null
    },
    requesterId?: string
) {
    try {
        const updateData: any = {}
        if (data.dept_name !== undefined) updateData.dept_name = data.dept_name
        if (data.college_id !== undefined) updateData.college_id = data.college_id
        if (data.manager_id !== undefined) updateData.manager_id = data.manager_id

        const department = await db.departments.update({
            where: { department_id: departmentId },
            data: updateData
        })

        if (requesterId) {
            const executor = await db.users.findUnique({ where: { university_id: requesterId } })
            await logAuditAction(executor?.user_id, 'UPDATE', 'DEPARTMENT', department.dept_name, { updated_fields: Object.keys(updateData) })
        }

        // revalidatePath('/admin')
        return { success: true, data: department }
    } catch (error) {
        console.error("Update Department Error:", error)
        return { success: false, error: "فشل في تحديث القسم" }
    }
}

/**
 * Delete department
 */
export async function deleteDepartment(departmentId: number, requesterId?: string) {
    try {
        // Check if department has users
        const users = await db.users.findMany({
            where: { department_id: departmentId }
        })

        if (users.length > 0) {
            return {
                success: false,
                error: "لا يمكن حذف القسم لأنه يحتوي على مستخدمين"
            }
        }

        const dept = await db.departments.findUnique({ where: { department_id: departmentId } })

        await db.departments.delete({
            where: { department_id: departmentId }
        })

        if (requesterId) {
            const executor = await db.users.findUnique({ where: { university_id: requesterId } })
            await logAuditAction(executor?.user_id, 'DELETE', 'DEPARTMENT', dept?.dept_name || departmentId.toString(), null)
        }

        // revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error("Delete Department Error:", error)
        return { success: false, error: "فشل في حذف القسم" }
    }
}

/**
 * Get eligible users for dean/manager roles
 */
export async function getEligibleManagers() {
    try {
        const users = await db.users.findMany({
            where: {
                is_active: true,
                roles: {
                    role_name: {
                        in: ['employee', 'admin']
                    }
                }
            },
            include: {
                roles: true,
                departments_users_department_idTodepartments: {
                    include: {
                        colleges: true
                    }
                }
            },
            orderBy: { full_name: 'asc' }
        })

        return {
            success: true,
            data: users
        }
    } catch (error) {
        console.error("Get Eligible Managers Error:", error)
        return { success: false, error: "فشل في تحميل المستخدمين المؤهلين" }
    }
}
